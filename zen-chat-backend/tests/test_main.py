"""Tests for Zen Chat API."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

VALID_MESSAGE = {
  "id": "test-1",
  "role": "user",
  "content": "hi",
  "createdAt": "2025-01-01T00:00:00Z",
}


def test_health_returns_200() -> None:
  response = client.get("/health")
  assert response.status_code == 200
  assert response.json() == {"status": "ok"}


def test_health_not_rate_limited() -> None:
  for _ in range(5):
    response = client.get("/health")
    assert response.status_code == 200


def test_chat_messages_over_limit_returns_422() -> None:
  messages = [
    {"id": f"m{i}", "role": "user", "content": "x", "createdAt": "2025-01-01T00:00:00Z"}
    for i in range(51)
  ]
  response = client.post("/api/chat", json={"messages": messages})
  assert response.status_code == 422


def test_chat_content_over_limit_returns_422() -> None:
  long_content = "x" * 4001
  response = client.post(
    "/api/chat",
    json={
      "messages": [
        {
          "id": "t",
          "role": "user",
          "content": long_content,
          "createdAt": "2025-01-01T00:00:00Z",
        }
      ]
    },
  )
  assert response.status_code == 422


def test_chat_empty_messages_returns_400() -> None:
  response = client.post("/api/chat", json={"messages": []})
  assert response.status_code == 400
