# Feature: Dev Script (Frontend + Backend)

## Feature Description

A single script at the project root that starts both the Breath frontend (Vite) and Zen Chat backend (FastAPI) dev servers with one command. Developers run `./dev` or `npm run dev` from the repo root instead of manually opening two terminals.

## User Story

As a developer working on the Breath app
I want to run one command from the project root to start both frontend and backend
So that I can begin development quickly without remembering separate commands and ports

## Problem Statement

Currently developers must:

1. Open a terminal, `cd breath-web`, run `npm run dev` (port 5173)
2. Open another terminal, `cd zen-chat-backend`, run `uvicorn app.main:app --reload --port 8000`

This is tedious and error-prone when switching between projects.

## Solution Statement

Add a root-level dev script (shell or npm) that spawns both processes. Use a simple approach: `concurrently` (npm) or a bash script with background processes. Prefer npm script for cross-platform consistency.

## Relevant Files

- `breath-web/package.json` – frontend dev script (`npm run dev`)
- `zen-chat-backend/README.md` – backend run instructions (uvicorn)
- `README.md` – update run instructions to mention the new script

### New Files

- `scripts/dev.sh` or root `package.json` with `dev` script

## Relevant Research

- [concurrently npm](https://www.npmjs.com/package/concurrently) – run multiple commands in parallel
- [npm scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts) – lifecycle scripts

## Implementation Plan

### Phase 1: Foundation

Add a root `package.json` if it doesn't exist, or add a `scripts/dev.sh` that can be invoked from root.

### Phase 2: Core Implementation

Create the dev script that starts both servers. Use `concurrently` for clean output and cross-platform support, or a minimal bash script.

### Phase 3: Integration

Update root README.md to document the new `npm run dev` or `./scripts/dev.sh` command.

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### 1. Create root package.json with dev script

- Add `package.json` at repo root with `dev` script
- Use `concurrently` to run `npm run dev` in breath-web and `uv run uvicorn app.main:app --reload --port 8000` in zen-chat-backend
- Add `concurrently` as devDependency

### 2. Update README.md

- Add "Run locally (all services)" section documenting `npm run dev` from root
- Keep existing per-service instructions for when running individually

### 3. Validation

- Run `npm run dev` from root and verify both servers start
- Confirm frontend at [http://localhost:5173](http://localhost:5173) and backend at [http://localhost:8000/health](http://localhost:8000/health)

## Testing Strategy

Manual verification only. No unit tests needed for a dev convenience script.

### Acceptance Criteria

- One command from repo root starts both frontend and backend
- Frontend accessible at [http://localhost:5173](http://localhost:5173)
- Backend health check at [http://localhost:8000/health](http://localhost:8000/health) returns 200
- README documents the new command

## Validation Commands

- From repo root: `npm run dev` – both servers start
- `curl -s http://localhost:8000/health` – returns 200
- Open [http://localhost:5173](http://localhost:5173) – Breath app loads

## Notes

- If root `package.json` already exists, merge scripts instead of overwriting
- `uv` must be installed for the backend (Python); `npm` for frontend

