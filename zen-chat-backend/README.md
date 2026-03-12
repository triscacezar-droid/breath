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

### Deploy

**Required env:** `OPENAI_API_KEY` (add as secret on your host). Optional: `ZEN_CHAT_MODEL` (default: `gpt-4o-mini`).

**Railway**

1. New Project → Deploy from GitHub → select this repo.
2. Set root directory to `zen-chat-backend`.
3. Add env var: `OPENAI_API_KEY` (secret).
4. Railway will use the Dockerfile or Nixpacks. Copy the generated URL (e.g. `https://xxx.up.railway.app`).

**Render**

1. New Web Service → connect repo.
2. Root directory: `zen-chat-backend`.
3. Build: `uv sync --frozen --no-dev` (or use Docker).
4. Start: `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
5. Add `OPENAI_API_KEY` in Environment.

**Docker**

```bash
cd zen-chat-backend
docker build -t zen-chat .
docker run -e OPENAI_API_KEY=sk-... -p 8000:8000 zen-chat
```

