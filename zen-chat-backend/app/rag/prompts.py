"""Prompt templates for Zen Chat RAG."""

from __future__ import annotations

from app.rag.schemas import RagContext


def build_system_prompt() -> str:
  """Return the base system prompt for Zen Chat."""
  return (
    "You are a calm, knowledgeable companion inside a breathing meditation app. "
    "Be genuinely helpful first — answer the question directly, share concrete techniques, and use any provided context. "
    "Keep responses brief and grounded. "
    "Avoid clinical language, avoid talking about yourself as an AI, and avoid giving long lists. "
    "Only reference the breath or posture when it is naturally relevant to what the user asked."
  )


def build_rag_context_message(context: RagContext) -> str | None:
  """Render the RAG context as an additional system-style message.

  Args:
    context: Selected chunks for the current query.

  Returns:
    A formatted message string, or None if there is no context.
  """
  block = context.to_prompt_block()
  if not block:
    return None
  return block

