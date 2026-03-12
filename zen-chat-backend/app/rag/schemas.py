"""Pydantic schemas for RAG over Buddhist texts.

These models describe how documents, chunks, search results, and RAG
context are represented inside the Zen Chat backend.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class RagDocument(BaseModel):
  """A source document in the Buddhist corpus."""

  document_id: str = Field(..., description="Stable identifier for the document.")
  title: str = Field(..., description="Human-readable title of the text or section.")
  source: str = Field(
    ...,
    description="Collection or corpus source, e.g. 'Pali Canon', 'CBETA', 'BDRC'.",
  )
  url: str | None = Field(
    default=None,
    description="Optional URL where the full text can be consulted.",
  )
  metadata: dict[str, Any] = Field(
    default_factory=dict,
    description="Arbitrary extra metadata (language, volume, etc.).",
  )


class RagChunk(BaseModel):
  """A semantically meaningful chunk of a Buddhist text."""

  chunk_id: str = Field(..., description="Stable identifier for this chunk.")
  document_id: str = Field(..., description="Identifier of the parent document.")
  title: str = Field(..., description="Title of the document or subsection.")
  source: str = Field(..., description="Collection / corpus source.")
  url: str | None = Field(
    default=None,
    description="Optional URL pointing near this chunk in the source text.",
  )
  content: str = Field(..., description="Plain-text content of the chunk.")
  order: int = Field(
    ...,
    description="Monotonic order of the chunk within its document (0-based).",
  )
  metadata: dict[str, Any] = Field(
    default_factory=dict,
    description="Additional metadata such as section headings or tags.",
  )


class RagSearchResult(BaseModel):
  """Result entry returned from a similarity search."""

  chunk: RagChunk
  score: float = Field(..., description="Similarity score; higher means more relevant.")


class RagContext(BaseModel):
  """Context assembled from RAG search to feed into the LLM."""

  chunks: list[RagChunk] = Field(
    default_factory=list,
    description="Selected chunks that will be formatted into the prompt.",
  )

  def to_prompt_block(self) -> str:
    """Render the context into a block of text suitable for a system message.

    Returns:
      A formatted string containing short excerpts with lightweight citations.
    """
    if not self.chunks:
      return ""

    lines: list[str] = []
    lines.append(
      "The following are short excerpts from Buddhist texts. "
      "Use them as quiet background inspiration for your reply. "
      "You do not need to quote them directly."
    )
    for idx, chunk in enumerate(self.chunks, start=1):
      label_parts: list[str] = [chunk.title]
      if chunk.source:
        label_parts.append(chunk.source)
      label = " — ".join(label_parts)
      lines.append(f"\n[{idx}] {label}")
      lines.append(chunk.content.strip())
    return "\n".join(lines)

