# Feature: Mitigate Zen Chat Security Issues

## Feature Description

Harden the Zen Chat backend against abuse and information disclosure. The backend is publicly exposed (Railway) with no authentication. Identified risks: API abuse / quota burn (high), permissive CORS (medium), prompt injection (low–medium), unbounded input size (low), and error message disclosure (low). This plan adds rate limiting, restricts CORS, caps input size, sanitizes error responses, and documents prompt-injection awareness.

## User Story

As the owner of the Breath app
I want the Zen Chat API to resist abuse and limit information leakage
So that my OpenAI quota and budget are protected and internal details stay private

## Problem Statement

The Zen Chat backend (`zen-chat-backend`) is deployed publicly with no protections. Anyone who knows the Railway URL can spam `/api/chat`, burn through the OpenAI API key, and incur cost. CORS allows `*`, enabling any website to call the API. There are no limits on message count or content length. Unhandled exceptions return raw error strings (up to 400 chars) in 503 responses, which can leak internal paths or stack traces.

## Solution Statement

1. **Rate limiting** – Add per-IP rate limits on `/api/chat` using SlowAPI to cap abuse and quota burn.
2. **CORS restriction** – Replace `*` with explicit allowed origins (production domains + localhost for dev).
3. **Input limits** – Cap `messages` array length and `content` length via Pydantic validators.
4. **Error sanitization** – In production, return generic error messages instead of `str(exc)` in 503 responses.
5. **Documentation** – Document prompt-injection awareness and optional mitigations (no code change for now).

## Relevant Files

- `zen-chat-backend/app/main.py` – FastAPI app, CORS (lines 71–77), ChatRequest/ChatMessage models (lines 18–37), exception handler (lines 55–68), chat endpoint (lines 93–188)
- `zen-chat-backend/pyproject.toml` – Dependencies; add `slowapi`
- `zen-chat-backend/README.md` – Document new env vars (`CORS_ORIGINS`, `ZEN_CHAT_RATE_LIMIT`, etc.) and security notes
- `breath-web/vite.config.ts` – Dev proxy target; no changes needed (proxy uses localhost)

### New Files

- `zen-chat-backend/app/config.py` – Centralized config (CORS origins, rate limits, env-based production flag) for type safety and testability
- `zen-chat-backend/tests/test_main.py` – Unit tests for rate limiting, validation, and error responses (if tests are introduced)

## Relevant Research

- [SlowAPI – Rate limiting for FastAPI](https://slowapi.readthedocs.io/en/stable/)
  - Quick start, decorator-based limits
  - `@limiter.limit("10/minute")`, `get_remote_address` for IP-based limiting
- [CORS (Cross-Origin Resource Sharing) – FastAPI](https://fastapi.tiangolo.com/tutorial/cors/)
  - `allow_origins` list; cannot use `*` with `allow_credentials=True`
- [Pydantic Field constraints](https://docs.pydantic.dev/latest/concepts/fields/#field-constraints)
  - `max_length`, `Field(..., max_length=N)` for string/content limits
- [FastAPI Request validation](https://fastapi.tiangolo.com/tutorial/body/)
  - Pydantic validators for list length (`max_length` on `List`)

## Implementation Plan

### Phase 1: Foundation

Add config module and SlowAPI dependency. Introduce environment-based production flag and CORS origins list. No behavior change yet.

### Phase 2: Core Implementation

Apply rate limiting to `/api/chat`, restrict CORS to configurable origins, add Pydantic input limits, and sanitize exception handler for production.

### Phase 3: Integration

Ensure `/health` remains unrestricted. Verify local dev (localhost origins) and production (simplebreath.co.uk, breath-jet.vercel.app) work. Update README with new env vars and security notes.

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### 1. Add SlowAPI dependency

- Run `cd zen-chat-backend && uv add slowapi`
- Add to `pyproject.toml` dependencies

### 2. Create config module

- Create `zen-chat-backend/app/config.py`:
  - `PRODUCTION: bool` from `os.environ.get("ENVIRONMENT") == "production"` (or `RAILWAY_ENVIRONMENT`, etc.)
  - `CORS_ORIGINS: list[str]` from `CORS_ORIGINS` env (comma-separated) or default: `["http://localhost:5173", "http://127.0.0.1:5173", "https://simplebreath.co.uk", "https://breath-jet.vercel.app"]`
  - `RATE_LIMIT_CHAT: str` from `ZEN_CHAT_RATE_LIMIT` or default `"20/minute"` (per IP)
  - `MAX_MESSAGES: int` = 50, `MAX_CONTENT_LENGTH: int` = 4000
  - All with type hints and docstrings

### 3. Add input validation to Pydantic models

- In `main.py`, update `ChatMessage`:
  - `content: str = Field(..., min_length=1, max_length=4000)` (use config value or constant)
- Update `ChatRequest`:
  - Add validator or `Field` constraint: `messages: List[ChatMessage]` with `max_length=50` (Pydantic v2: `Field(..., max_length=50)`)

### 4. Integrate SlowAPI rate limiting

- Import `Limiter`, `get_remote_address`, `RateLimitExceeded`, `_rate_limit_exceeded_handler`
- Create `limiter = Limiter(key_func=get_remote_address)`
- Attach to app: `app.state.limiter = limiter`
- Add exception handler for `RateLimitExceeded` returning 429 with `ChatErrorResponse`-style body
- Add `@limiter.limit(config.RATE_LIMIT_CHAT)` and `Request` param to `chat` endpoint

### 5. Restrict CORS

- Replace `allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"]` with `config.CORS_ORIGINS`
- Keep `allow_credentials=True`, `allow_methods=["POST", "OPTIONS"]`, `allow_headers=["*"]` (or restrict headers if desired)

### 6. Sanitize exception handler for production

- In `catch_unhandled_exception`: if `config.PRODUCTION`, use generic message `"Zen chat is temporarily unavailable. Try again later."` instead of `str(exc)[:400]`
- In dev, keep detailed message for debugging

### 7. Update README

- Add "Security" or "Configuration" section in `zen-chat-backend/README.md`:
  - `CORS_ORIGINS` – comma-separated allowed origins (optional)
  - `ZEN_CHAT_RATE_LIMIT` – e.g. `20/minute` (optional)
  - `ENVIRONMENT=production` – enables generic error messages
  - Note on prompt injection: user content is sent to OpenAI; system prompt is fixed; consider future mitigations if needed

### 8. Add unit tests (optional but recommended)

- Create `zen-chat-backend/tests/test_main.py`:
  - Test rate limit returns 429 when exceeded
  - Test `messages` over 50 returns 422
  - Test `content` over 4000 chars returns 422
  - Test CORS headers for allowed origin
  - Test health endpoint is not rate limited
- Run `uv run pytest zen-chat-backend/tests/ -v`

### 9. Validation

- Lint: `cd zen-chat-backend && uv run ruff check app/`
- Type check: `uv run mypy app/` (if mypy is configured)
- Manual: `npm run dev` from repo root, send chat from UI; verify behavior
- Manual: `curl -X POST http://localhost:8000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"id":"t","role":"user","content":"hi","createdAt":"2025-01-01T00:00:00Z"}]}'` – succeeds
- Manual: Send 25+ requests in a minute – should get 429 after limit
- Manual: Send `messages` with 51 items – should get 422
- Set `ENVIRONMENT=production` and trigger an error – should see generic message

## Testing Strategy

### Unit Tests

- Rate limit: mock or use real requests; assert 429 after N requests
- Validation: assert 422 for `messages` length > 50, `content` length > 4000
- CORS: assert `Access-Control-Allow-Origin` for allowed origin; assert no CORS for disallowed origin

### Integration Tests

- Full chat flow: POST valid request, assert 200 and valid `ChatResponse`
- Health: GET `/health`, assert 200, no rate limit

### Edge Cases

- Empty `messages` (already 400)
- `messages` with 51 items
- Single message with `content` of 4001 chars
- `maxTokens`/`temperature` at boundaries (already validated)
- Rate limit exactly at boundary (20th request in minute)

## Acceptance Criteria

- `zen-chat-backend` has SlowAPI dependency
- `zen-chat-backend/app/config.py` exists with CORS origins, rate limit, production flag
- `/api/chat` has per-IP rate limit (default 20/minute)
- CORS allows only configured origins (no `*` in production)
- `ChatMessage.content` max 4000 chars; `ChatRequest.messages` max 50 items
- In production, exception handler returns generic message (no `str(exc)`)
- README documents new env vars and security notes
- `/health` is not rate limited and returns 200

## Validation Commands

- `cd zen-chat-backend && uv run ruff check app/` – Lint passes
- `cd zen-chat-backend && uv run pytest tests/ -v` – All tests pass (if tests added)
- Start: `npm run dev` from repo root
- Health: `curl -s http://localhost:8000/health` → `{"status":"ok"}`
- Chat: `curl -s -X POST http://localhost:8000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"id":"t","role":"user","content":"hi","createdAt":"2025-01-01T00:00:00Z"}]}'` → 200 with valid JSON
- Rate limit: Run 21+ requests in 1 minute → 429 on excess
- Validation: Send 51 messages → 422
- Stop server after validation

## Notes

- **SlowAPI**: Use `uv add slowapi`. The `Request` object must be injected into the `chat` endpoint for rate limiting to work.
- **CORS_ORIGINS**: For Railway, set `CORS_ORIGINS=https://simplebreath.co.uk,https://breath-jet.vercel.app` (and optionally localhost for testing). Comma-separated, no spaces.
- **Prompt injection**: No code change in this plan. The system prompt is fixed and sent first. Document that user content goes to OpenAI; consider content filtering or output validation in future if needed.
- **Redis for rate limiting**: SlowAPI supports Redis for distributed rate limiting. For single-replica Railway, in-memory is sufficient. If scaling to multiple replicas, add Redis.
- **ENVIRONMENT**: Railway sets `RAILWAY_ENVIRONMENT=production` by default. Use that or `ENVIRONMENT` for the production flag.

