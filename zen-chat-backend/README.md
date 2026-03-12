## Zen Chat Backend

Minimal FastAPI backend for the Zen Buddhist chatbot sidebar. Exposes an HTTP API that matches the frontend `ChatRequest`/`ChatResponse` types and is ready to be extended with a full RAG pipeline.

### API

- `POST /api/chat`
  - Request body: `ChatRequest` (session id + array of messages).
  - Response body: `ChatResponse` (assistant message + optional citations).
- `GET /health`
  - Returns simple status payload for health checks.

### Run locally

**Required:** Set `OPENAI_API_KEY` in your environment (or create a `.env` file in `zen-chat-backend/`).

```bash
cd zen-chat-backend
export OPENAI_API_KEY=sk-...
uv run uvicorn app.main:app --reload --port 8000
```

Or from the project root with `npm run dev` (starts both frontend and backend). Ensure `OPENAI_API_KEY` is set before starting.

### Security & configuration

Optional env vars:

- `CORS_ORIGINS` – Comma-separated allowed origins (default: localhost + simplebreath.co.uk + breath-jet.vercel.app).
- `ZEN_CHAT_RATE_LIMIT` – Rate limit for `/api/chat` (default: `20/minute` per IP).
- `ENVIRONMENT=production` or `RAILWAY_ENVIRONMENT=production` – Enables generic error messages (no raw exception text in 503 responses).
- `RAG_ENABLED` – When `true`, enable retrieval-augmented generation over the Buddhist text corpus.
- `RAG_VECTOR_STORE_PATH` – Directory for the Chroma vector store (default: `app/../data/buddhist_vectors`).
- `RAG_EMBEDDING_MODEL` – OpenAI embedding model used for indexing and search (default: `text-embedding-3-small`).
- `RAG_TOP_K` – Maximum number of chunks to retrieve per query (default: `4`).

**Prompt injection:** User content is sent to OpenAI. The system prompt is fixed and sent first. Consider content filtering or output validation for stricter use cases.

### RAG over Buddhist texts

This backend can optionally ground replies in a local corpus of Buddhist texts using
retrieval-augmented generation (RAG).

#### Acquiring the corpus

A small sample (Dhammapada excerpts) is included. For a larger corpus:

```bash
cd zen-chat-backend
uv run python -m scripts.fetch_buddhist_corpus --source huggingface
```

**Sources and licenses:**

| Source       | License | Description                                      |
|-------------|---------|--------------------------------------------------|
| `huggingface` | CC BY 4.0 | Buddhist Classics Vol.13 (English, ~1.7GB)      |
| `sample`    | Public domain | Dhammapada excerpts (included)              |

Ingestion requires `OPENAI_API_KEY` for embeddings.

#### Corpus location and ingestion

- Corpus location: UTF-8 `.txt` files under `data/buddhist_texts/` (subdirs: `sample/`, `huggingface/`, etc.).
- Ingestion:
  - Ensure `OPENAI_API_KEY` is set.
  - Run `cd zen-chat-backend` then:
    - `uv run python -m app.rag.ingest`
- Enabling RAG at runtime:
  - Set `RAG_ENABLED=true` in the backend environment.
  - Optionally set `RAG_VECTOR_STORE_PATH`, `RAG_EMBEDDING_MODEL`, and `RAG_TOP_K`.
- API behavior:
  - `/api/chat` continues to accept the same `ChatRequest` payload.
  - When RAG is enabled and the corpus has been ingested, the backend retrieves
    relevant chunks and passes them as quiet background context to the model.
  - Citations are returned via the `citations` field in `ChatResponse`.

### Deploy

**Required env:** `OPENAI_API_KEY` (add as secret on your host). Optional: `ZEN_CHAT_MODEL` (default: `gpt-4o-mini`), `RAG_ENABLED` (default: `false`).

**RAG:** The Dockerfile runs `app.rag.ingest` during build, so the vector store is baked into the image. Set `RAG_ENABLED=true` at runtime. `OPENAI_API_KEY` must be available at build time (Railway injects it; for local Docker use `--build-arg`).

**Railway**

1. New Project → Deploy from GitHub → select this repo.
2. Set root directory to `zen-chat-backend`.
3. Add env var: `OPENAI_API_KEY` (secret). Add `RAG_ENABLED=true` for RAG.
4. Railway uses the Dockerfile; build injects env vars. Copy the generated URL (e.g. `https://xxx.up.railway.app`).

**Render**

1. New Web Service → connect repo.
2. Root directory: `zen-chat-backend`.
3. Build: `uv sync --frozen --no-dev` (or use Docker).
4. Start: `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. Add `OPENAI_API_KEY` in Environment.

**Docker**

```bash
cd zen-chat-backend
docker build --build-arg OPENAI_API_KEY=sk-... -t zen-chat .
docker run -e OPENAI_API_KEY=sk-... -e RAG_ENABLED=true -p 8000:8000 zen-chat
```

