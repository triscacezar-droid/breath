# Feature: Deploy Zen Chat

## Feature Description

Enable the Zen Chat chatbot on the deployed Breath app by hosting the `zen-chat-backend` (FastAPI) and configuring the frontend (Vercel) to use it. Users visiting simplebreath.co.uk or breath-jet.vercel.app will see and use the Zen companion chat when enabled.

## User Story

As a user of the deployed Breath app
I want the Zen Chat companion to work when I open it
So that I can get calm, brief reflections while breathing

## Problem Statement

Zen Chat works locally (`npm run dev` starts both frontend and backend) but is disabled and unreachable in production. The deployed frontend has no backend to call, and `VITE_ZEN_CHAT_ENABLED` is off by default.

## Solution Statement

1. Add deployment artifacts for `zen-chat-backend` (Dockerfile, platform configs) so it can be hosted on Railway, Render, or similar.
2. Document the exact env vars and steps to enable Zen Chat on Vercel and the chosen backend host.
3. Update README with a "Deploy Zen Chat" section for maintainers.

## Relevant Files

- `zen-chat-backend/app/main.py` – FastAPI app, CORS, `/api/chat`, `/health`
- `zen-chat-backend/pyproject.toml` – Python deps, uv
- `breath-web/src/lib/chatClient.ts` – `getApiBaseUrl()`, uses `VITE_ZEN_CHAT_API_URL`
- `breath-web/src/constants.ts` – `ZEN_CHAT_ENABLED` from `VITE_ZEN_CHAT_ENABLED`
- `README.md` – deployment instructions

### New Files

- `zen-chat-backend/Dockerfile` – container for backend
- `zen-chat-backend/railway.json` or `railway.toml` – Railway config (optional)
- `zen-chat-backend/render.yaml` – Render blueprint (optional)

## Relevant Research

- [Deploy a FastAPI App | Railway Guides](https://docs.railway.com/guides/fastapi)
  - Railway supports GitHub deploy, Docker, `railway.json`
  - Uses Hypercorn or uvicorn
- [Deploy a FastAPI App – Render Docs](https://render.com/docs/deploy-fastapi)
  - Build: `pip install -r requirements.txt` or Docker
  - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
  - `VITE_*` vars are baked into the build

## Implementation Plan

### Phase 1: Backend Deployment Artifacts

Add a Dockerfile and optional platform configs so the backend can be deployed without manual setup.

### Phase 2: Documentation

Document env vars and steps for Vercel + backend host. No code changes to frontend/backend logic.

### Phase 3: Validation

Verify backend runs in container; document manual deployment checklist.

## Step by Step Tasks

### 1. Create Dockerfile for zen-chat-backend

- Add `zen-chat-backend/Dockerfile`:
  - Base: `python:3.11-slim`
  - Install uv, copy `pyproject.toml`, `uv.lock`, `app/`
  - Run `uv sync --frozen` (or `uv sync` if no lock in image)
  - Expose port 8000
  - CMD: `uv run uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Ensure `.env` is not copied (use runtime env vars)

### 2. Add .dockerignore for zen-chat-backend

- Create `zen-chat-backend/.dockerignore`:
  - `.env`, `.venv`, `__pycache__`, `*.pyc`, `.git`, `*.egg-info`

### 3. Add Railway config (optional)

- Create `zen-chat-backend/railway.json`:
  - `build.command`: `uv sync`
  - `start.command`: `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Or use `railway.toml` per [Railway docs](https://docs.railway.com/guides/fastapi)

### 4. Update zen-chat-backend README

- Add "Deploy" section:
  - Railway: connect repo, set root to `zen-chat-backend`, add `OPENAI_API_KEY`
  - Render: new Web Service, root `zen-chat-backend`, build `uv sync`, start `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
  - Docker: `docker build -t zen-chat . && docker run -e OPENAI_API_KEY=sk-... -p 8000:8000 zen-chat`
  - List required env: `OPENAI_API_KEY`, optional `ZEN_CHAT_MODEL`

### 5. Update root README with "Deploy Zen Chat"

- Add section "Deploy Zen Chat (production)":
  - Step 1: Deploy backend (link to zen-chat-backend/README.md)
  - Step 2: In Vercel project, add env vars:
    - `VITE_ZEN_CHAT_ENABLED=true`
    - `VITE_ZEN_CHAT_API_URL=https://your-backend-url.com` (no trailing slash)
  - Step 3: Redeploy frontend
  - Note: CORS allows `*`; restrict in backend if needed for production

### 6. Verify backend runs in Docker locally

- From `zen-chat-backend/`: `docker build -t zen-chat .`
- Run: `docker run -e OPENAI_API_KEY=sk-... -p 8000:8000 zen-chat`
- `curl -s http://localhost:8000/health` → `{"status":"ok"}`
- `curl -s -X POST http://localhost:8000/api/chat -H "Content-Type: application/json" -d '{"messages":[{"id":"t","role":"user","content":"hi","createdAt":"2025-01-01T00:00:00Z"}]}'` → valid response or 503 (if no key)

### 7. Validation

- Docker build succeeds
- Container starts and `/health` returns 200
- README sections are clear and complete

## Testing Strategy

### Manual Verification

- Docker build and run (step 6)
- No unit/integration tests required for deployment configs (infrastructure only)

### Edge Cases

- Backend URL with/without trailing slash (chatClient uses `${baseUrl}/api/chat`)
- Missing OPENAI_API_KEY in container (backend returns 503)

## Acceptance Criteria

- [ ] `zen-chat-backend/Dockerfile` exists and builds
- [ ] `zen-chat-backend/.dockerignore` excludes secrets and cache
- [ ] `zen-chat-backend/README.md` has Deploy section
- [ ] Root `README.md` has "Deploy Zen Chat" section
- [ ] `docker build` and `docker run` work locally
- [ ] `/health` returns 200 from container

## Validation Commands

- `cd zen-chat-backend && docker build -t zen-chat .` – build succeeds
- `docker run -e OPENAI_API_KEY=sk-test -p 8000:8000 zen-chat` – container starts
- `curl -s http://localhost:8000/health` – returns `{"status":"ok"}`
- Stop container after validation

## Notes

- Railway and Render both support `uv`; use `uv sync` for install.
- `OPENAI_API_KEY` must be set as a secret on the hosting platform.
- Frontend is already configured; only env vars and backend URL need to be set in production.
