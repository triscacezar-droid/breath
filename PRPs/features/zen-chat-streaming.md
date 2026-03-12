# Feature: Zen Chat Message Streaming

## Feature Description

Stream assistant messages token-by-token so they appear incrementally in the UI instead of spawning all at once when the response completes. This improves perceived latency and keeps the Zen Chat experience calm and responsive.

## User Story

As a user of the Breath app
I want assistant replies to stream in as they are generated
So that I see a response sooner and the interaction feels more natural

## Problem Statement

Currently, the Zen Chat backend waits for the full OpenAI completion before returning. The frontend shows a loading indicator (three dots) until the entire response arrives, then displays it all at once. For longer replies, this creates noticeable delay and a jarring "pop-in" effect.

## Solution Statement

1. **Backend**: Add a streaming endpoint (or `stream` query param on `/api/chat`) that calls OpenAI with `stream=True`, yields SSE events for each content delta, and sends a final event with message metadata and citations.
2. **Frontend**: Use `fetch` with `ReadableStream`, parse SSE events, add a placeholder assistant message when streaming starts, append each chunk to its `content`, and finalize when the stream ends.
3. **RAG**: Citations are only available after retrieval; send them in the final SSE event so the UI can display them when streaming completes.

## Relevant Files

- `zen-chat-backend/app/main.py` – Chat endpoint (lines 143–247); add streaming route or branch
- `zen-chat-backend/app/rag/service.py` – `append_rag_messages`, `context_to_citations`; reuse for streaming
- `breath-web/src/lib/chatClient.ts` – Add `sendChatMessageStream()` with SSE parsing
- `breath-web/src/hooks/useZenChat.ts` – Switch to streaming send, manage placeholder message and incremental updates
- `breath-web/src/components/ZenChatPanel.tsx` – Remove loading dots for assistant when streaming (show streaming message instead)
- `breath-web/src/types/chat.ts` – Add streaming callback types if needed

### New Files

- None required; extend existing modules.

## Relevant Research

- [Streaming API responses | OpenAI](https://platform.openai.com/docs/guides/streaming-responses)
  - `stream=True` for Chat Completions; `delta.content` for text chunks
- [How to stream completions | OpenAI Cookbook](https://cookbook.openai.com/examples/how_to_stream_completions)
  - Python SDK: `async for chunk in stream`; `chunk.choices[0].delta.content`
- [FastAPI StreamingResponse](https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse)
  - `StreamingResponse(generator(), media_type="text/event-stream")`
- [Server-Sent Events (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
  - Format: `data: <payload>\n\n`; `event:` for custom event types
- [fetch with ReadableStream for SSE](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
  - Use `response.body` with `TextDecoderStream` or manual chunk parsing

## Implementation Plan

### Phase 1: Foundation

- Add `POST /api/chat/stream` endpoint (or `?stream=true` on `/api/chat`) that accepts the same `ChatRequest` body.
- Reuse existing validation, RAG context building, and OpenAI client setup from the non-streaming endpoint.

### Phase 2: Core Implementation

- **Backend**: Call `client.chat.completions.create(..., stream=True)`, iterate over chunks, yield SSE events:
  - `data: {"type":"content","delta":"<text>"}\n\n` for each content delta
  - `data: {"type":"done","id":"...","messageId":"...","citations":[...]}\n\n` at end
- **Frontend**: Implement `sendChatMessageStream(request, onChunk, onDone)` that:
  - Uses `fetch` with `response.body.getReader()` and `TextDecoderStream`
  - Parses SSE lines (`data: ...`), accumulates content, invokes `onChunk(content)` and `onDone({ id, messageId, citations })`
- **Hook**: In `useZenChat`, add placeholder assistant message when stream starts, call `onChunk` to append to `content`, call `onDone` to finalize and add citations.

### Phase 3: Integration

- Replace non-streaming `sendChatMessage` usage with `sendChatMessageStream` in `useZenChat`.
- Update `ZenChatPanel`: when streaming, show the assistant message with growing content instead of loading dots; hide dots once the first chunk arrives.
- Preserve error handling and rate-limit behavior; apply same limits to streaming endpoint.

## Step by Step Tasks

IMPORTANT: Execute every step in order, top to bottom.

### 1. Backend: Add streaming endpoint

- In `zen-chat-backend/app/main.py`, add `POST /api/chat/stream` (or extend `/api/chat` with `stream: bool = Query(False)`).
- Reuse request validation, RAG setup, and message building from the existing `chat` handler.
- Call `client.chat.completions.create(..., stream=True)`.
- Create async generator that:
  - Yields `data: {"type":"content","delta":<content>}\n\n` for each `chunk.choices[0].delta.content`
  - After loop, yields `data: {"type":"done","id":"...","messageId":"...","citations":<citations>}\n\n`
- Return `StreamingResponse(generator(), media_type="text/event-stream")`.
- Apply same `@limiter.limit(RATE_LIMIT_CHAT)` decorator.
- Handle OpenAI errors (429, auth) the same way; for streaming, send `data: {"type":"error","errorCode":"...","errorMessage":"..."}\n\n` before raising if needed, or rely on HTTP status.

### 2. Backend: Error handling in stream

- Wrap the generator in try/except; on OpenAI exception, yield an error event and return, or let the exception propagate (client will see connection close).
- Prefer yielding `data: {"type":"error",...}\n\n` so the frontend can show a proper error message.

### 3. Frontend: Add SSE parsing utility

- In `breath-web/src/lib/chatClient.ts` (or a new `streamUtils.ts`), add a function to parse SSE from a `ReadableStream<Uint8Array>`:
  - Use `response.body.pipeThrough(new TextDecoderStream())` and read line-by-line.
  - For lines starting with `data: `, parse JSON and return events.
  - Handle `[DONE]` or our custom `done` event.

### 4. Frontend: Add sendChatMessageStream

- In `chatClient.ts`, add `sendChatMessageStream(request, callbacks)`:
  - `fetch(POST /api/chat/stream, body: JSON.stringify(request))`
  - If `!response.ok`, parse error JSON from body (if available) and throw.
  - Otherwise, parse SSE stream, call `onChunk(delta)` for each content delta, `onDone({ id, messageId, citations })` at end, or `onError(err)` on error event.
  - Return a promise that resolves when stream ends or rejects on fetch/parse error.

### 5. Frontend: Update useZenChat to use streaming

- In `useZenChat.ts`, replace `sendChatMessage` with `sendChatMessageStream`.
- When stream starts: add placeholder assistant message `{ id: "assistant-streaming", role: "assistant", content: "", createdAt: "..." }`.
- On each `onChunk(delta)`: `setMessages(prev => [...prev.slice(0,-1), { ...last, content: last.content + delta }])`.
- On `onDone`: replace placeholder with final message (id from server, content accumulated, citations if any).
- On error: remove placeholder, set error state as before.
- Ensure `isLoading` is true until stream completes.

### 6. Frontend: Update ZenChatPanel for streaming UX

- When `isLoading` and the last message is an assistant message with empty or partial content, show that message (with growing content) instead of the three-dot loader.
- Optionally show a subtle cursor or "..." at the end of streaming content.
- When stream ends, remove any cursor indicator.

### 7. Validation

- Run backend: `cd zen-chat-backend && uv run uvicorn app.main:app --reload`
- Run frontend: `cd breath-web && npm run dev`
- Send a message; verify tokens stream in.
- Verify citations appear when RAG is enabled.
- Verify error handling (e.g., invalid API key) still works.
- Run `uv run ruff check zen-chat-backend/app/` and `uv run mypy zen-chat-backend/app/` (if configured).
- Run `npm run lint` in breath-web.

## Testing Strategy

See `CLAUDE.md` and `BREATH.md` for testing expectations.

### Unit Tests

- **Backend**: Mock OpenAI stream, assert SSE events are yielded in correct format; test error event on exception.
- **Frontend**: Mock `fetch` returning a ReadableStream of SSE events; assert `onChunk` and `onDone` are called with correct args.

### Integration Tests

- Manual: Start both servers, send message, observe streaming in browser.
- Optional: E2E test with Playwright if available.

### Edge Cases

- Empty content chunks (skip).
- Stream ends without `done` event (timeout or connection drop).
- RAG disabled (citations null in done event).
- Very long message (ensure no buffer issues).

## Acceptance Criteria

- [ ] Assistant messages appear token-by-token as they are generated.
- [ ] No full-message "pop-in" after loading; content grows incrementally.
- [ ] Citations (when RAG enabled) appear when streaming completes.
- [ ] Error states (network, API key, rate limit) are handled and displayed.
- [ ] Loading indicator shows until first chunk or error.
- [ ] Non-streaming fallback is not required (streaming is the default path).

## Validation Commands

- **Backend lint**: `cd zen-chat-backend && uv run ruff check app/`
- **Backend type check**: `cd zen-chat-backend && uv run mypy app/` (if mypy is configured)
- **Backend tests**: `cd zen-chat-backend && uv run pytest tests/ -v` (if tests exist)
- **Frontend lint**: `cd breath-web && npm run lint`
- **Manual**: Start both servers, send Zen Chat message, verify streaming behavior.

## Notes

- The existing `/api/chat` endpoint can remain for compatibility or be deprecated in favor of `/api/chat/stream`; the plan assumes we add a dedicated streaming route to keep the non-streaming path simple.
- If the project adds a logger (`@/lib/logger`), use it for `fetching_stream`, `stream_chunk_received`, `stream_complete`, `stream_error`.
- No new dependencies required; `fetch` and `ReadableStream` are built-in; SSE parsing can be done with a small inline loop.
