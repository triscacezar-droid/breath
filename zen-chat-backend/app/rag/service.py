"""High-level RAG service for Zen Chat."""

from __future__ import annotations

from typing import Protocol

from openai import OpenAI

from app import config
from app.rag.prompts import build_rag_context_message
from app.rag.schemas import RagContext, RagChunk
from app.rag.store import RagStore, create_chroma_store


class ChatRequestLike(Protocol):
  """Minimal protocol capturing the attributes RagService needs from ChatRequest."""

  @property
  def messages(self) -> list:  # pragma: no cover
    ...


class RagService:
  """Orchestrates retrieval and prompt enrichment for Zen Chat."""

  def __init__(self, store: RagStore) -> None:
    self._store = store

  def build_context_for_request(self, body: ChatRequestLike) -> RagContext:
    """Build retrieval context for the current chat request.

    Uses the latest user message as the primary query.
    """
    if not body.messages:
      return RagContext()

    # Prefer the last user message; if none, fall back to last message content.
    last_user = next(
      (m for m in reversed(body.messages) if m.role == "user"),
      None,
    )
    query_text = last_user.content if last_user is not None else body.messages[-1].content

    results = self._store.search(query_text, top_k=config.RAG_TOP_K)
    chunks = [result.chunk for result in results]
    return RagContext(chunks=chunks)

  @staticmethod
  def context_to_citations(context: RagContext) -> list[ChatCitation]:
    """Convert RAG context chunks into ChatCitation objects."""
    from app.main import ChatCitation  # Local import to avoid circular dependency

    citations: list[ChatCitation] = []
    for idx, chunk in enumerate(context.chunks, start=1):
      citations.append(
        ChatCitation(
          id=f"citation-{idx}",
          title=chunk.title,
          source=chunk.source,
          url=chunk.url,
          snippet=chunk.content[:400],
        )
      )
    return citations


def init_rag_service_for_app(openai_client: OpenAI) -> RagService | None:
  """Initialize the RAG service based on configuration.

  Returns:
    A RagService instance if RAG is enabled, otherwise None.
  """
  if not config.RAG_ENABLED:
    return None

  store = create_chroma_store(
    persist_directory=config.RAG_VECTOR_STORE_PATH,
    client=openai_client,
    embedding_model=config.RAG_EMBEDDING_MODEL,
  )
  return RagService(store=store)


def append_rag_messages(
  base_messages: list[dict[str, str]],
  context: RagContext,
) -> list[dict[str, str]]:
  """Return a new messages list with RAG context appended if available."""
  rag_message = build_rag_context_message(context)
  if not rag_message:
    return base_messages
  # Insert an extra system-style message after the main system prompt.
  extended: list[dict[str, str]] = []
  if base_messages:
    extended.append(base_messages[0])
    extended.append({"role": "system", "content": rag_message})
    extended.extend(base_messages[1:])
  else:
    extended.append({"role": "system", "content": rag_message})
  return extended

