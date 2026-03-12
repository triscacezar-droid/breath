FROM python:3.11-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies (no dev)
RUN uv sync --frozen --no-dev

# Copy application and corpus
COPY app/ ./app/
COPY data/ ./data/

# Build RAG vector store at image build time (requires OPENAI_API_KEY)
ARG OPENAI_API_KEY
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
RUN uv run python -m app.rag.ingest

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
