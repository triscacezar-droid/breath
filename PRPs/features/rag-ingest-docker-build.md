# Feature: RAG Ingest During Docker Build

## Feature Description

Run the Buddhist corpus ingestion step during the Docker image build so the vector store is baked into the image. When the backend deploys to Railway (or any container host), RAG works immediately without a separate ingest step or persistent volume.

## User Story

As a developer deploying Zen Chat to Railway
I want the RAG vector store to be built into the Docker image
So that RAG works on deploy without running ingest manually or configuring volumes

## Problem Statement

Railway containers are ephemeral. Running `railway run uv run python -m app.rag.ingest` executes locally and writes to the developer's machine—not to Railway. The deployed backend has no vector store, so RAG_ENABLED has no effect. Persistent volumes add complexity. A build-time ingest solves this by baking the indexed corpus into the image.

## Solution Statement

1. **Copy corpus into image** – Include `data/buddhist_texts/` (sample Dhammapada) in the Docker build context.
2. **Run ingest during build** – Add a `RUN` step that executes `uv run python -m app.rag.ingest` with `OPENAI_API_KEY` passed as a build arg.
3. **Update .dockerignore** – Ensure `data/buddhist_texts/` is NOT ignored (it's in repo); ensure `data/buddhist_vectors/` is not copied from host (we create it in build).
4. **Document** – Update README with build instructions for local Docker and Railway.

## Relevant Files

- `zen-chat-backend/Dockerfile` – Add COPY for data/, ARG for OPENAI_API_KEY, RUN ingest step
- `zen-chat-backend/.dockerignore` – Ensure data/buddhist_texts is included; exclude data/buddhist_vectors from host (or allow; build overwrites)
- `zen-chat-backend/README.md` – Document build with RAG, Railway env var behavior
- `zen-chat-backend/app/rag/ingest.py` – Ingest logic; uses DATA_DIR, RAG_VECTOR_STORE_PATH from config

### New Files

- None

## Relevant Research

- [Docker ARG and ENV](https://docs.docker.com/engine/reference/builder/#arg)
  - Use ARG for build-time secrets; ENV to expose to RUN
- [Railway Build Environment](https://docs.railway.app/deploy/dockerfiles)
  - Railway injects project env vars during build; OPENAI_API_KEY available
- [Multi-stage builds for secrets](https://docs.docker.com/build/building/secrets/)
  - For maximum security, consider Docker BuildKit secrets; ARG is simpler and works with Railway

## Implementation Plan

### Phase 1: Foundation

- Update .dockerignore so `data/buddhist_texts/` is included in the build context (it's not currently ignored; verify).
- Ensure `data/buddhist_vectors/` from host is not copied (we create it fresh during build).

### Phase 2: Core Implementation

- Add to Dockerfile:
  - `COPY data/ ./data/` (or `COPY data/buddhist_texts/ ./data/buddhist_texts/`)
  - `ARG OPENAI_API_KEY` and `ENV OPENAI_API_KEY=${OPENAI_API_KEY}` for the RUN step
  - `RUN uv run python -m app.rag.ingest` (runs after deps and app are copied)
- Handle case where OPENAI_API_KEY is empty (build fails gracefully or skip ingest).

### Phase 3: Integration

- Document in README: local build `docker build --build-arg OPENAI_API_KEY=sk-... -t zen-chat .`
- Note that Railway injects env vars during build automatically.

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### 1. Update .dockerignore

- Ensure `data/buddhist_texts/` is NOT in .dockerignore (we need it in the image).
- Add `data/buddhist_vectors/` to .dockerignore so we don't copy stale local vectors; we create fresh during build.

### 2. Update Dockerfile

- After `COPY app/ ./app/`, add `COPY data/ ./data/` to include the corpus.
- Add `ARG OPENAI_API_KEY` before the ingest step.
- Add `ENV OPENAI_API_KEY=${OPENAI_API_KEY}` so the RUN step can access it.
- Add `RUN uv run python -m app.rag.ingest` (before CMD).
- If OPENAI_API_KEY is empty, ingest will fail—document that it must be set for RAG image.

### 3. Update README

- In Deploy section, add note: "For RAG: OPENAI_API_KEY must be set in Railway (or as build arg). The image runs ingest during build."
- Local Docker: `docker build --build-arg OPENAI_API_KEY=sk-... -t zen-chat .`

### 4. Validation

- Build locally: `docker build --build-arg OPENAI_API_KEY=sk-... -t zen-chat .`
- Run: `docker run -e RAG_ENABLED=true -p 8000:8000 zen-chat`
- `curl -s http://localhost:8000/health` → 200
- Send chat message; verify citations appear when RAG is enabled.

## Testing Strategy

### Manual Verification

- Docker build succeeds with OPENAI_API_KEY.
- Container starts; RAG returns citations for relevant queries.

### Edge Cases

- Build without OPENAI_API_KEY: ingest fails; document that it's required for RAG.
- Empty data/buddhist_texts: ingest produces no chunks; RAG returns no citations (graceful).

## Acceptance Criteria

- [ ] Dockerfile runs `app.rag.ingest` during build when OPENAI_API_KEY is provided.
- [ ] Built image contains the vector store; RAG works when RAG_ENABLED=true.
- [ ] README documents build-arg for local Docker and Railway behavior.
- [ ] .dockerignore excludes host's data/buddhist_vectors (build creates its own).

## Validation Commands

- `cd zen-chat-backend && docker build --build-arg OPENAI_API_KEY=$OPENAI_API_KEY -t zen-chat .`
- `docker run -e RAG_ENABLED=true -e OPENAI_API_KEY=$OPENAI_API_KEY -p 8000:8000 zen-chat`
- `curl -s http://localhost:8000/health` → `{"status":"ok"}`
- Send chat "What did the Buddha say about hatred?" → verify citations.

## Notes

- Railway injects env vars during build; OPENAI_API_KEY from project settings should be available. If not, use Railway's build-arg config.
- The sample corpus (Dhammapada) is small; ingest adds ~30–60 seconds to build.
- For larger corpora later, consider caching the ingest layer or using a pre-built vector store artifact.
