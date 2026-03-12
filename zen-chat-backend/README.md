## Zen Chat Backend

Minimal FastAPI backend for the Zen Buddhist chatbot sidebar. Exposes an HTTP API that matches the frontend `ChatRequest`/`ChatResponse` types and is ready to be extended with a full RAG pipeline.

### API

- `POST /api/chat`
  - Request body: `ChatRequest` (session id + array of messages).
  - Response body: `ChatResponse` (assistant message + optional citations).
- `GET /health`
  - Returns simple status payload for health checks.

### Run locally

```bash
cd zen-chat-backend
uvicorn app.main:app --reload --port 8000
```

Then point the frontend `VITE_ZEN_CHAT_API_URL` to `http://localhost:8000`.

