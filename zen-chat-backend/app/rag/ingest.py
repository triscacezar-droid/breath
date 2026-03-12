"""Ingestion pipeline for Buddhist texts into the RAG vector store.

This module is designed to be run as a script, e.g.:

  uv run python -m app.rag.ingest

It reads plain-text files from ``data/buddhist_texts/``, chunks them, and
indexes them into the configured Chroma vector store.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from openai import OpenAI

from app import config
from app.rag.schemas import RagChunk
from app.rag.store import create_chroma_store


# zen-chat-backend root (parent of app/)
_DATA_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = _DATA_ROOT / "data" / "buddhist_texts"


def _iter_text_files(root: Path) -> Iterable[Path]:
  for path in root.rglob("*.txt"):
    if path.is_file():
      yield path


def _simple_chunk_lines(text: str, max_chars: int = 800) -> list[str]:
  """Chunk text on paragraph/line boundaries up to ~max_chars."""
  paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
  chunks: list[str] = []
  current: list[str] = []
  current_len = 0

  for para in paragraphs:
    if current_len + len(para) + 1 > max_chars and current:
      chunks.append("\n\n".join(current).strip())
      current = []
      current_len = 0
    current.append(para)
    current_len += len(para) + 2

  if current:
    chunks.append("\n\n".join(current).strip())
  return chunks


def build_chunks_for_file(path: Path, source: str) -> list[RagChunk]:
  text = path.read_text(encoding="utf-8")
  title = path.stem.replace("_", " ").title()
  document_id = str(path.relative_to(DATA_DIR))
  url = None

  chunks_text = _simple_chunk_lines(text)
  chunks: list[RagChunk] = []
  for idx, content in enumerate(chunks_text):
    chunk_id = f"{document_id}::chunk-{idx}"
    chunks.append(
      RagChunk(
        chunk_id=chunk_id,
        document_id=document_id,
        title=title,
        source=source,
        url=url,
        content=content,
        order=idx,
      )
    )
  return chunks


def ingest_corpus() -> None:
  """Ingest all text files from DATA_DIR into the vector store."""
  if not DATA_DIR.exists():
    raise RuntimeError(f"Data directory does not exist: {DATA_DIR}")

  api_key = os.environ.get("OPENAI_API_KEY")
  if not api_key:
    raise RuntimeError("OPENAI_API_KEY must be set to run ingestion.")

  client = OpenAI(api_key=api_key)
  store = create_chroma_store(
    persist_directory=config.RAG_VECTOR_STORE_PATH,
    client=client,
    embedding_model=config.RAG_EMBEDDING_MODEL,
  )

  SOURCE_MAP: dict[str, str] = {
    "sample": "Dhammapada (sample)",
    "huggingface": "Buddhist Classics (Hugging Face)",
    "suttacentral": "SuttaCentral",
  }
  all_chunks: list[RagChunk] = []

  for path in _iter_text_files(DATA_DIR):
    rel = path.relative_to(DATA_DIR)
    parts = rel.parts
    subdir = parts[0] if len(parts) > 1 else None
    source = SOURCE_MAP.get(subdir or "", subdir or "Buddhist Corpus")
    all_chunks.extend(build_chunks_for_file(path, source=source))

  if not all_chunks:
    return

  store.index_chunks(all_chunks)


if __name__ == "__main__":
  ingest_corpus()

