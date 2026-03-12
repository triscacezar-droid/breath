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

