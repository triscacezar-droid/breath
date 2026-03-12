import os
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
  id: str = Field(..., description="Client-generated unique identifier for the message.")
  role: str = Field(..., pattern="^(user|assistant|system)$")
  content: str = Field(..., min_length=1, description="Message content in plain text.")
  createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatCitation(BaseModel):
  id: str
  title: str
  source: str
  url: Optional[str] = None
  snippet: str


class ChatRequest(BaseModel):
  sessionId: Optional[str] = None
  messages: List[ChatMessage]
  maxTokens: Optional[int] = Field(default=None, ge=1, le=4096)
  temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)


class ChatResponse(BaseModel):
  id: str
  message: ChatMessage
  citations: Optional[List[ChatCitation]] = None


class ChatErrorResponse(BaseModel):
  errorCode: str
  errorMessage: str


app = FastAPI(title="Zen Chat Backend", version="0.1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
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
  return model or "gpt-4.1-mini"


@app.post("/api/chat", response_model=ChatResponse, responses={400: {"model": ChatErrorResponse}})
async def chat(request: ChatRequest) -> ChatResponse:
  if not request.messages:
    raise HTTPException(
      status_code=400,
      detail=ChatErrorResponse(
        errorCode="empty_messages",
        errorMessage="At least one message is required.",
      ).model_dump(),
    )

  client = _get_openai_client()
  model_name = _get_model_name()

  system_prompt = (
    "You are a calm Zen Buddhist companion inside a breathing app. "
    "Respond briefly, gently, and concretely. "
    "Avoid clinical language, avoid talking about yourself as an AI, and avoid giving long lists. "
    "Gently point attention back to the breath, posture, and direct experience."
  )

  openai_messages: list[dict[str, str]] = [
    {"role": "system", "content": system_prompt},
  ]
  for message in request.messages:
    openai_messages.append(
      {
        "role": message.role,
        "content": message.content,
      }
    )

  max_tokens = request.maxTokens if request.maxTokens is not None else 256
  temperature = request.temperature if request.temperature is not None else 0.7

  completion = client.chat.completions.create(
    model=model_name,
    messages=openai_messages,
    max_tokens=max_tokens,
    temperature=temperature,
  )

  content = completion.choices[0].message.content or ""
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
    citations=None,
  )


@app.get("/health")
async def health() -> dict[str, str]:
  return {"status": "ok"}

