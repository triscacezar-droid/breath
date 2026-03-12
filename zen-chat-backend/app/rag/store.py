"""Vector store abstraction for Buddhist RAG.

For the initial implementation we use Chroma as an embedded vector store
backed by SQLite on disk. The store is initialized once at startup and
re-used for all requests via FastAPI application state.
"""

from __future__ import annotations

from typing import Iterable, Protocol

from chromadb import Client as ChromaClient
from chromadb.config import Settings as ChromaSettings
from openai import OpenAI

from app.rag.schemas import RagChunk, RagSearchResult


class RagStore(Protocol):
  """Protocol for a retrieval store used by the RAG service."""

  def index_chunks(self, chunks: Iterable[RagChunk]) -> None:
    """Index or update a collection of chunks in the store."""

  def search(self, query: str, top_k: int) -> list[RagSearchResult]:
    """Return the top_k most similar chunks for the given query."""


class ChromaRagStore:
  """Chroma-backed implementation of RagStore."""

  def __init__(self, persist_directory: str, collection_name: str, client: OpenAI, embedding_model: str) -> None:
    self._client = client
    self._embedding_model = embedding_model
    self._chroma = ChromaClient(
      settings=ChromaSettings(
        persist_directory=persist_directory,
        is_persistent=True,
      )
    )
    self._collection = self._chroma.get_or_create_collection(name=collection_name)

  def _embed(self, texts: list[str]) -> list[list[float]]:
    """Compute embeddings for a batch of texts using OpenAI."""
    response = self._client.embeddings.create(
      model=self._embedding_model,
      input=texts,
    )
    return [item.embedding for item in response.data]

  def index_chunks(self, chunks: Iterable[RagChunk]) -> None:
    ids: list[str] = []
    texts: list[str] = []
    metadatas: list[dict[str, str]] = []

    for chunk in chunks:
      ids.append(chunk.chunk_id)
      texts.append(chunk.content)
      metadatas.append(
        {
          "document_id": chunk.document_id,
          "title": chunk.title,
          "source": chunk.source,
          "url": chunk.url or "",
          "order": str(chunk.order),
        }
      )

    if not ids:
      return

    embeddings = self._embed(texts)
    self._collection.add(
      ids=ids,
      embeddings=embeddings,
      metadatas=metadatas,
      documents=texts,
    )

  def search(self, query: str, top_k: int) -> list[RagSearchResult]:
    if not query.strip():
      return []

    query_embedding = self._embed([query])[0]
    results = self._collection.query(
      query_embeddings=[query_embedding],
      n_results=top_k,
    )

    scores = results.get("distances") or [[]]
    metadatas = results.get("metadatas") or [[]]
    documents = results.get("documents") or [[]]
    ids = results.get("ids") or [[]]

    out: list[RagSearchResult] = []
    for idx, meta in enumerate(metadatas[0]):
      document_id = str(meta.get("document_id", ""))
      title = str(meta.get("title", ""))
      source = str(meta.get("source", ""))
      url = str(meta.get("url", "") or "") or None
      order_str = str(meta.get("order", "0"))
      try:
        order = int(order_str)
      except ValueError:
        order = 0

      chunk = RagChunk(
        chunk_id=str(ids[0][idx]),
        document_id=document_id,
        title=title,
        source=source,
        url=url,
        content=str(documents[0][idx]),
        order=order,
      )
      score = float(scores[0][idx]) if scores and scores[0] else 0.0
      out.append(RagSearchResult(chunk=chunk, score=score))
    return out


def create_chroma_store(persist_directory: str, client: OpenAI, embedding_model: str) -> ChromaRagStore:
  """Factory used at FastAPI startup to initialize the RAG store."""
  return ChromaRagStore(
    persist_directory=persist_directory,
    collection_name="buddhist_texts",
    client=client,
    embedding_model=embedding_model,
  )

