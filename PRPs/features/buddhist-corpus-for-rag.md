# Feature: Buddhist Corpus for RAG

## Feature Description

Acquire, prepare, and ingest a Buddhist text corpus into the Zen Chat RAG pipeline so that assistant replies can be grounded in canonical and contemplative Buddhist literature. The corpus will be stored as UTF-8 plain-text files in `zen-chat-backend/data/buddhist_texts/`, then chunked and indexed by the existing `app.rag.ingest` pipeline.

## User Story

As a user of the Breath app's Zen Chat
I want assistant replies to draw from authentic Buddhist texts
So that reflections feel grounded in tradition and support contemplative practice

## Problem Statement

The Zen Chat backend has a complete RAG pipeline (Chroma vector store, ingestion, retrieval, citations) but no corpus. The `data/buddhist_texts/` directory is empty or missing. Without texts, RAG_ENABLED has no effect. Users receive generic LLM replies instead of responses informed by Buddhist literature.

## Solution Statement

1. **Source selection** – Choose one or more freely available Buddhist text collections with clear licensing (CC0, CC-BY, or public domain).
2. **Acquisition** – Add a script or documented steps to download and extract texts into plain UTF-8 `.txt` format.
3. **Preparation** – Convert or extract text from HTML/PDF/Markdown where needed; organize files under `data/buddhist_texts/` with sensible naming.
4. **Ingestion** – Run the existing `uv run python -m app.rag.ingest` pipeline to chunk and index the corpus.
5. **Documentation** – Update README with corpus sources, licensing, and acquisition instructions.

## Relevant Files

- `zen-chat-backend/app/rag/ingest.py` – Ingestion pipeline; reads `.txt` from `data/buddhist_texts/`, chunks, indexes into Chroma (lines 24–106)
- `zen-chat-backend/app/rag/schemas.py` – `RagChunk` schema; `source` field for corpus attribution (e.g. "Pali Canon", "SuttaCentral")
- `zen-chat-backend/app/config.py` – `RAG_VECTOR_STORE_PATH`, `RAG_EMBEDDING_MODEL`, `RAG_TOP_K` (lines 50–64)
- `zen-chat-backend/README.md` – RAG documentation; corpus location and ingestion steps (lines 39–55)

### New Files

- `zen-chat-backend/scripts/fetch_buddhist_corpus.py` – Download/extract script for chosen corpus sources
- `zen-chat-backend/data/buddhist_texts/` – Directory for plain-text corpus files (created by script or manually)
- `zen-chat-backend/data/buddhist_texts/.gitkeep` – Optional; keep directory in git if corpus is small, or document that it is gitignored for large corpora

## Relevant Research

- [SuttaCentral Editions (GitHub)](https://github.com/suttacentral/editions)
  - [main.zip download](https://github.com/suttacentral/editions/archive/refs/heads/main.zip)
  - CC0-1.0 license; English Pali Canon translations (DN, MN, SN, AN, Dhp, etc.) in HTML/EPUB/PDF; can extract text from HTML
- [Access to Insight – Bulk Download](https://www.accesstoinsight.org/tech/download/bulk.html)
  - [ati.zip](http://accesstoinsight.org/tech/download/ati.zip) – ~80 MB; CC-BY; HTML files; extract text with BeautifulSoup or similar
- [Hugging Face – Buddhist Classics Vol.14](https://huggingface.co/datasets/ospx1u/buddhist-classics-vol14-20-pali-tibetan-ja-ko)
  - CC0; parallel .txt files (Pali, English, Japanese, Korean); RAG-ready; `load_dataset()` then save to disk
- [CBETA (Chinese Buddhist Electronic Text Association)](https://cbeta.org/en)
  - Chinese canon; requires different tooling; consider for future multilingual expansion
- [BDRC (Buddhist Digital Resource Center)](https://www.bdrc.io/)
  - Tibetan and multilingual; API and downloads; more complex integration

## Implementation Plan

### Phase 1: Foundation

- Create `zen-chat-backend/data/buddhist_texts/` directory.
- Add `scripts/` directory and a minimal `fetch_buddhist_corpus.py` that downloads one source (e.g. SuttaCentral editions or Hugging Face dataset) and writes plain `.txt` files.
- Document licensing and attribution in README.

### Phase 2: Core Implementation

- Implement download logic for chosen source(s):
  - **Option A (SuttaCentral)**: Download `editions` zip, extract HTML, convert HTML to plain text (strip tags, preserve paragraphs).
  - **Option B (Hugging Face)**: Use `datasets` library to load `ospx1u/buddhist-classics-vol14-20-pali-tibetan-ja-ko`, extract English `.en` splits, write to `data/buddhist_texts/`.
  - **Option C (Access to Insight)**: Download ati.zip, extract HTML, convert to plain text.
- Organize files with meaningful names (e.g. `dn_long_discourses.txt`, `mn_middle_discourses.txt`) and set `source` in chunks via subdirectory or filename convention.

### Phase 3: Integration

- Extend `ingest.py` if needed to support subdirectories (each subdir = different `source`) or to read `source` from a manifest.
- Run ingestion; verify RAG returns relevant chunks for sample queries.
- Update README with corpus acquisition steps and licensing.

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### 1. Create data directory and script scaffold

- Create `zen-chat-backend/data/buddhist_texts/` (and parent `data/` if needed).
- Create `zen-chat-backend/scripts/fetch_buddhist_corpus.py` with `argparse` for `--source` (e.g. `suttacentral`, `huggingface`).
- Add `if __name__ == "__main__"` entry point; no-op or placeholder download logic.

### 2. Implement Hugging Face source (recommended for simplicity)

- Add `datasets` to `zen-chat-backend` dev or main dependencies: `uv add datasets`.
- In `fetch_buddhist_corpus.py`, implement `fetch_from_huggingface()`:
  - `load_dataset("ospx1u/buddhist-classics-vol14-20-pali-tibetan-ja-ko")`
  - Iterate over English splits (`.en` or equivalent column), write each document/section to `data/buddhist_texts/<name>.txt`.
  - Use UTF-8 encoding.
- Set `source="Buddhist Classics (Hugging Face)"` or similar for attribution (ingest uses `source` from `build_chunks_for_file`; may need to pass source per file or via subdirectory).

### 3. Extend ingest to support source per file

- In `ingest.py`, `build_chunks_for_file` already accepts `source`; currently hardcoded as `"Buddhist Corpus"`.
- Derive `source` from subdirectory name or a simple manifest (e.g. `source_map.json` mapping filename → source).
- Example: `data/buddhist_texts/suttacentral/dn.txt` → `source="SuttaCentral"`; `data/buddhist_texts/huggingface/vol14_en.txt` → `source="Buddhist Classics"`.

### 4. Implement SuttaCentral source (optional, for richer English canon)

- Download `https://github.com/suttacentral/editions/archive/refs/heads/main.zip`.
- Extract; locate HTML files under `en/sujato/` (or similar).
- Use `html.parser` or `BeautifulSoup` to extract text; write to `data/buddhist_texts/suttacentral/<nikaya>.txt`.
- Add `beautifulsoup4` if needed: `uv add beautifulsoup4`.

### 5. Add .gitignore for large corpus (optional)

- If corpus exceeds ~10 MB, add `zen-chat-backend/data/buddhist_texts/*.txt` to `.gitignore` (or ignore `data/` except `.gitkeep`).
- Document in README that users must run `fetch_buddhist_corpus.py` before ingestion.

### 6. Documentation

- Update `zen-chat-backend/README.md` RAG section:
  - Add "Acquiring the corpus" subsection with steps to run `python -m scripts.fetch_buddhist_corpus --source huggingface` (or equivalent).
  - List corpus sources, licenses (CC0, CC-BY), and attribution requirements.
  - Note that ingestion requires `OPENAI_API_KEY` for embeddings.

### 7. Validation

- Run `python -m scripts.fetch_buddhist_corpus --source huggingface` (or chosen source).
- Verify `.txt` files appear in `data/buddhist_texts/`.
- Run `uv run python -m app.rag.ingest`.
- Set `RAG_ENABLED=true`, start backend, send a chat message; verify citations include Buddhist text excerpts.
- Run `uv run ruff check zen-chat-backend/app/` and `uv run pytest zen-chat-backend/tests/ -v`.

## Testing Strategy

See `CLAUDE.md` and `BREATH.md` for testing expectations.

### Unit Tests

- **Backend**: Mock `load_dataset` or file I/O; test that `fetch_buddhist_corpus` writes expected files given a fixture. Mark with `@pytest.mark.unit`.
- **Ingest**: Existing ingest tests (if any) should still pass; add test that `build_chunks_for_file` uses correct `source` when provided.

### Integration Tests

- Manual: Run fetch script → ingest → start server → send chat with RAG enabled → verify citations.
- Optional: Add `tests/integration/test_rag_corpus.py` that checks corpus dir exists and has `.txt` files after fetch (skip if fetch not run).

### Edge Cases

- Empty dataset from Hugging Face.
- Malformed HTML in SuttaCentral extraction.
- Very large corpus (streaming write, memory limits).
- Non-UTF-8 files (reject or transcode).

## Acceptance Criteria

- [ ] `scripts/fetch_buddhist_corpus.py` downloads at least one Buddhist text source and writes UTF-8 `.txt` files to `data/buddhist_texts/`.
- [ ] Ingest pipeline successfully chunks and indexes the corpus.
- [ ] With RAG_ENABLED=true, chat responses include citations from the corpus when relevant.
- [ ] README documents corpus sources, licenses, and acquisition steps.
- [ ] No proprietary or unclear-license texts are included.

## Validation Commands

- **Fetch corpus**: `cd zen-chat-backend && uv run python -m scripts.fetch_buddhist_corpus --source huggingface`
- **Ingest**: `cd zen-chat-backend && uv run python -m app.rag.ingest`
- **Backend lint**: `cd zen-chat-backend && uv run ruff check app/ scripts/`
- **Backend tests**: `cd zen-chat-backend && uv run pytest tests/ -v`
- **Manual RAG test**: Start backend with `RAG_ENABLED=true`, send "What did the Buddha say about breath?" or similar; verify citations.

## Notes

- **Recommended first source**: Hugging Face `ospx1u/buddhist-classics-vol14-20-pali-tibetan-ja-ko` – CC0, RAG-ready .txt, simple `load_dataset` API.
- **SuttaCentral editions**: Richer English canon (Bhikkhu Sujato translations) but requires HTML→text conversion; good second source.
- **Access to Insight**: CC-BY requires attribution; include in citations/source field.
- **Multilingual**: Hugging Face dataset has Tibetan, Japanese, Korean; ingest could support multiple languages if needed later.
- **Chroma upsert**: Current `index_chunks` uses `add()`; repeated ingest may duplicate chunks. Consider `delete` + `add` or `update` for idempotent re-ingestion.
- **Size**: Hugging Face Vol.14 is ~157 MB; SuttaCentral editions zip ~150 MB. Consider partial downloads (e.g. Dhammapada only) for faster iteration.
