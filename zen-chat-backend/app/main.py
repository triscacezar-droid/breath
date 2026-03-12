import json
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from zen-chat-backend directory
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from datetime import datetime, timezone
from typing import AsyncGenerator, List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from openai import AsyncOpenAI, OpenAI
from pydantic import BaseModel, Field, ValidationError
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import (
  CORS_ORIGIN_REGEX,
  CORS_ORIGINS,
  MAX_CONTENT_LENGTH,
  MAX_MESSAGES,
  PRODUCTION,
  RATE_LIMIT_CHAT,
  RAG_ENABLED,
)
from app.rag.prompts import build_system_prompt
from app.rag.service import RagService, append_rag_messages, init_rag_service_for_app


class ChatMessage(BaseModel):
  id: str = Field(..., description="Client-generated unique identifier for the message.")
  role: str = Field(..., pattern="^(user|assistant|system)$")
  content: str = Field(
    ...,
    min_length=1,
    max_length=MAX_CONTENT_LENGTH,
    description="Message content in plain text.",
  )
  createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatCitation(BaseModel):
  id: str
  title: str
  source: str
  url: Optional[str] = None
  snippet: str


class ChatRequest(BaseModel):
  sessionId: Optional[str] = None
  messages: List[ChatMessage] = Field(..., max_length=MAX_MESSAGES)
  maxTokens: Optional[int] = Field(default=None, ge=1, le=4096)
  temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)


class ChatResponse(BaseModel):
  id: str
  message: ChatMessage
  citations: Optional[List[ChatCitation]] = None


class ChatErrorResponse(BaseModel):
  errorCode: str
  errorMessage: str


limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Zen Chat Backend", version="0.1.0")
app.state.limiter = limiter
app.state.rag_service = None


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
  return JSONResponse(
    status_code=429,
    content={
      "detail": {
        "errorCode": "rate_limit_exceeded",
        "errorMessage": "Too many requests. Please try again later.",
      }
    },
  )


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
  msg = "Zen chat is temporarily unavailable. Try again later." if PRODUCTION else str(exc)[:400]
  return JSONResponse(
    status_code=503,
    content={
      "detail": {
        "errorCode": "chat_service_error",
        "errorMessage": msg,
      }
    },
  )


@app.exception_handler(Exception)
async def catch_unhandled_exception(request: Request, exc: Exception) -> JSONResponse:
  if isinstance(exc, HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
  msg = "Zen chat is temporarily unavailable. Try again later." if PRODUCTION else str(exc)[:400]
  return JSONResponse(
    status_code=503,
    content={
      "detail": {
        "errorCode": "chat_service_error",
        "errorMessage": msg,
      }
    },
  )


app.add_middleware(
  CORSMiddleware,
  allow_origins=CORS_ORIGINS,
  allow_origin_regex=CORS_ORIGIN_REGEX,
  allow_credentials=True,
  allow_methods=["POST", "OPTIONS"],
  allow_headers=["*"],
)


def _get_openai_client() -> OpenAI:
  api_key = os.environ.get("OPENAI_API_KEY")
  if not api_key:
    raise RuntimeError("OPENAI_API_KEY environment variable is not set.")
  return OpenAI(api_key=api_key)


def _get_model_name() -> str:
  model = os.environ.get("ZEN_CHAT_MODEL", "").strip()
  return model or "gpt-4o-mini"


@app.post("/api/chat", response_model=ChatResponse, responses={400: {"model": ChatErrorResponse}, 429: {"model": ChatErrorResponse}, 503: {"model": ChatErrorResponse}})
@limiter.limit(RATE_LIMIT_CHAT)
async def chat(request: Request, body: ChatRequest) -> ChatResponse:
  if not body.messages:
    raise HTTPException(
      status_code=400,
      detail=ChatErrorResponse(
        errorCode="empty_messages",
        errorMessage="At least one message is required.",
      ).model_dump(),
    )

  try:
    client = _get_openai_client()
  except RuntimeError as e:
    if "OPENAI_API_KEY" in str(e):
      raise HTTPException(
        status_code=503,
        detail=ChatErrorResponse(
          errorCode="api_key_not_configured",
          errorMessage="Zen chat is not configured. Set OPENAI_API_KEY in the backend environment.",
        ).model_dump(),
      ) from e
    raise

  # Lazily initialize RAG service once, if enabled.
  rag_service: RagService | None = app.state.rag_service
  if RAG_ENABLED and rag_service is None:
    rag_service = init_rag_service_for_app(client)
    app.state.rag_service = rag_service

  model_name = _get_model_name()

  system_prompt = build_system_prompt()

  openai_messages: list[dict[str, str]] = [
    {"role": "system", "content": system_prompt},
  ]
  for message in body.messages:
    openai_messages.append(
      {
        "role": message.role,
        "content": message.content,
      }
    )

  citations = None
  if RAG_ENABLED and rag_service is not None:
    context = rag_service.build_context_for_request(body)
    openai_messages = append_rag_messages(openai_messages, context)
    citations = rag_service.context_to_citations(context) or None

  max_tokens = body.maxTokens if body.maxTokens is not None else 256
  temperature = body.temperature if body.temperature is not None else 0.7

  try:
    completion = client.chat.completions.create(
      model=model_name,
      messages=openai_messages,
      max_tokens=max_tokens,
      temperature=temperature,
    )
  except Exception as e:
    msg = str(e)
    if "429" in msg or "quota" in msg.lower():
      raise HTTPException(
        status_code=503,
        detail=ChatErrorResponse(
          errorCode="quota_exceeded",
          errorMessage="OpenAI quota exceeded. Check your billing at platform.openai.com.",
        ).model_dump(),
      ) from e
    if "api_key" in msg.lower() or "authentication" in msg.lower():
      raise HTTPException(
        status_code=503,
        detail=ChatErrorResponse(
          errorCode="api_key_invalid",
          errorMessage="Zen chat API key is invalid or expired. Check OPENAI_API_KEY.",
        ).model_dump(),
      ) from e
    raise HTTPException(
      status_code=503,
      detail=ChatErrorResponse(
        errorCode="chat_service_error",
        errorMessage="Zen chat is temporarily unavailable. Try again later.",
      ).model_dump(),
    ) from e

  content = (completion.choices[0].message.content or "").strip()
  if not content:
    content = "…"
  now = datetime.now(timezone.utc)

  response_message = ChatMessage(
    id=f"assistant-{int(now.timestamp())}",
    role="assistant",
    content=content,
    createdAt=now,
  )

  return ChatResponse(
    id=f"chat-{int(now.timestamp())}",
    message=response_message,
    citations=citations,
  )


def _sse_line(data: dict) -> str:
  """Format a dict as an SSE data line."""
  return f"data: {json.dumps(data)}\n\n"


def _get_async_openai_client() -> AsyncOpenAI:
  api_key = os.environ.get("OPENAI_API_KEY")
  if not api_key:
    raise RuntimeError("OPENAI_API_KEY environment variable is not set.")
  return AsyncOpenAI(api_key=api_key)


async def _stream_chat_generator(
  client: AsyncOpenAI,
  model_name: str,
  openai_messages: list[dict[str, str]],
  max_tokens: int,
  temperature: float,
  citations: Optional[List[ChatCitation]],
) -> AsyncGenerator[str, None]:
  """Async generator yielding SSE events for streaming chat.

  Yields content deltas, then a done event with message metadata.
  On OpenAI exception, yields an error event.
  """
  try:
    stream = await client.chat.completions.create(
      model=model_name,
      messages=openai_messages,
      max_tokens=max_tokens,
      temperature=temperature,
      stream=True,
    )
    async for chunk in stream:
      delta = chunk.choices[0].delta.content if chunk.choices else None
      if delta:
        yield _sse_line({"type": "content", "delta": delta})

    now = datetime.now(timezone.utc)
    message_id = f"assistant-{int(now.timestamp())}"
    chat_id = f"chat-{int(now.timestamp())}"
    citations_payload = [c.model_dump() for c in (citations or [])]
    yield _sse_line(
      {
        "type": "done",
        "id": chat_id,
        "messageId": message_id,
        "citations": citations_payload,
      }
    )
  except Exception as e:
    msg = str(e)
    if "429" in msg or "quota" in msg.lower():
      yield _sse_line(
        {
          "type": "error",
          "errorCode": "quota_exceeded",
          "errorMessage": "OpenAI quota exceeded. Check your billing at platform.openai.com.",
        }
      )
    elif "api_key" in msg.lower() or "authentication" in msg.lower():
      yield _sse_line(
        {
          "type": "error",
          "errorCode": "api_key_invalid",
          "errorMessage": "Zen chat API key is invalid or expired. Check OPENAI_API_KEY.",
        }
      )
    else:
      yield _sse_line(
        {
          "type": "error",
          "errorCode": "chat_service_error",
          "errorMessage": "Zen chat is temporarily unavailable. Try again later.",
        }
      )


@app.post("/api/chat/stream", responses={400: {"model": ChatErrorResponse}, 429: {"model": ChatErrorResponse}, 503: {"model": ChatErrorResponse}})
@limiter.limit(RATE_LIMIT_CHAT)
async def chat_stream(request: Request, body: ChatRequest) -> StreamingResponse:
  """Stream assistant response token-by-token via SSE."""
  if not body.messages:
    raise HTTPException(
      status_code=400,
      detail=ChatErrorResponse(
        errorCode="empty_messages",
        errorMessage="At least one message is required.",
      ).model_dump(),
    )

  try:
    client = _get_async_openai_client()
  except RuntimeError as e:
    if "OPENAI_API_KEY" in str(e):
      raise HTTPException(
        status_code=503,
        detail=ChatErrorResponse(
          errorCode="api_key_not_configured",
          errorMessage="Zen chat is not configured. Set OPENAI_API_KEY in the backend environment.",
        ).model_dump(),
      ) from e
    raise

  rag_service: RagService | None = app.state.rag_service
  if RAG_ENABLED and rag_service is None:
    init_client = _get_openai_client()
    rag_service = init_rag_service_for_app(init_client)
    app.state.rag_service = rag_service

  model_name = _get_model_name()
  system_prompt = build_system_prompt()

  openai_messages: list[dict[str, str]] = [
    {"role": "system", "content": system_prompt},
  ]
  for message in body.messages:
    openai_messages.append(
      {"role": message.role, "content": message.content}
    )

  citations: Optional[List[ChatCitation]] = None
  if RAG_ENABLED and rag_service is not None:
    context = rag_service.build_context_for_request(body)
    openai_messages = append_rag_messages(openai_messages, context)
    citations = rag_service.context_to_citations(context) or None

  max_tokens = body.maxTokens if body.maxTokens is not None else 256
  temperature = body.temperature if body.temperature is not None else 0.7

  return StreamingResponse(
    _stream_chat_generator(
      client=client,
      model_name=model_name,
      openai_messages=openai_messages,
      max_tokens=max_tokens,
      temperature=temperature,
      citations=citations,
    ),
    media_type="text/event-stream",
  )


@app.get("/health")
async def health() -> dict[str, str]:
  return {"status": "ok"}

