"""Fetch Buddhist text corpus into data/buddhist_texts for RAG ingestion.

Usage:
  uv run python -m scripts.fetch_buddhist_corpus --source huggingface
  uv run python -m scripts.fetch_buddhist_corpus --source suttacentral

Sources:
  - huggingface: Buddhist Classics Vol.14 (Pali Canon, English) from Hugging Face
  - suttacentral: SuttaCentral editions (English Pali Canon)
"""

from __future__ import annotations

import argparse
from pathlib import Path

# Zen-chat-backend root (parent of scripts/)
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "buddhist_texts"


def _ensure_data_dir() -> Path:
    """Create data directory if it does not exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return DATA_DIR


def fetch_from_huggingface() -> None:
    """Download Buddhist Classics dataset from Hugging Face and write .txt files.

    Attempts ospx1u/buddhist-classics-vol13-english (CC BY 4.0). If the dataset
    structure is not load_dataset-compatible, prints a message. A sample corpus
    is included in data/buddhist_texts/sample/ for immediate use.
    """
    try:
        from datasets import load_dataset
    except ImportError:
        raise RuntimeError(
            "datasets package required. Run: uv add datasets"
        ) from None

    out_dir = _ensure_data_dir() / "huggingface"
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        print("Loading dataset (this may take a few minutes)...")
        dataset = load_dataset("ospx1u/buddhist-classics-vol13-english")
    except Exception as e:
        print(
            f"Hugging Face dataset load failed: {e}\n"
            "The Buddhist Classics dataset may use archive format (.7z).\n"
            "Use the included sample corpus: data/buddhist_texts/sample/\n"
            "Then run: uv run python -m app.rag.ingest"
        )
        (out_dir / ".gitkeep").touch()
        return

    written = 0
    for split_name, split_data in dataset.items():
        for idx, row in enumerate(split_data):
            text = None
            for key in ("text", "content", "en", "english", "translation"):
                if key in row and row[key]:
                    val = row[key]
                    if isinstance(val, str) and len(val.strip()) > 50:
                        text = val.strip()
                        break
            if text is None:
                for key, val in row.items():
                    if isinstance(val, str) and len(val) > 100:
                        text = val.strip()
                        break
            if text:
                safe_name = f"vol13_{split_name}_{idx}".replace("/", "_")
                out_path = out_dir / f"{safe_name}.txt"
                out_path.write_text(text, encoding="utf-8")
                written += 1

    (out_dir / ".gitkeep").touch()
    print(f"Wrote {written} files to {out_dir}")


def fetch_from_suttacentral() -> None:
    """Download SuttaCentral editions and extract text from HTML."""
    raise NotImplementedError("SuttaCentral source not yet implemented. Use --source huggingface.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch Buddhist corpus for RAG")
    parser.add_argument(
        "--source",
        choices=["huggingface", "suttacentral"],
        default="huggingface",
        help="Corpus source to fetch",
    )
    args = parser.parse_args()

    if args.source == "huggingface":
        fetch_from_huggingface()
    elif args.source == "suttacentral":
        fetch_from_suttacentral()
    else:
        raise ValueError(f"Unknown source: {args.source}")


if __name__ == "__main__":
    main()
