import type {
  ChatRequest,
  ChatResponse,
  ChatErrorResponse,
  ChatStreamCallbacks,
} from '../types/chat'

const defaultApiUrl = 'http://localhost:8000'

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_ZEN_CHAT_API_URL as string | undefined
  if (envUrl?.trim()) return envUrl.trim()
  // In dev, use relative URL so Vite proxies to backend (avoids CORS / connection issues)
  if (import.meta.env.DEV) return ''
  return defaultApiUrl
}

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const baseUrl = getApiBaseUrl()
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let errorCode: string | undefined
    let errorMessage: string | undefined
    try {
      const parsed = (await response.json()) as unknown

      const hasDetail = (value: unknown): value is { detail?: ChatErrorResponse } =>
        typeof value === 'object' && value !== null && 'detail' in value

      let detail: ChatErrorResponse | undefined
      if (hasDetail(parsed) && parsed.detail) {
        detail = parsed.detail
      } else {
        detail = parsed as ChatErrorResponse
      }

      errorCode = detail.errorCode
      errorMessage = detail.errorMessage
    } catch {
      // ignore parse errors and fall back to generic message
    }

    const code = errorCode ?? 'chat_request_failed'
    let message = errorMessage
    if (!message) {
      if (response.status === 500) {
        message =
          'Zen chat backend may not be running. Run `npm run dev` from the project root to start both frontend and backend.'
      } else {
        message = `Chat request failed with status ${response.status.toString()}`
      }
    }

    throw new Error(`${code}: ${message}`)
  }

  const data = (await response.json()) as ChatResponse
  return data
}

/** Parse SSE events from a ReadableStream. Yields parsed JSON objects for each `data:` line. */
async function* parseSSEStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<Record<string, unknown>, void, unknown> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += value
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('data: ')) {
        const payload = trimmed.slice(6)
        if (payload === '[DONE]') continue
        try {
          yield JSON.parse(payload) as Record<string, unknown>
        } catch {
          // skip malformed lines
        }
      }
    }
  }
  if (buffer.trim().startsWith('data: ')) {
    const payload = buffer.trim().slice(6)
    if (payload !== '[DONE]') {
      try {
        yield JSON.parse(payload) as Record<string, unknown>
      } catch {
        // skip
      }
    }
  }
}

export async function sendChatMessageStream(
  request: ChatRequest,
  callbacks: ChatStreamCallbacks
): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const response = await fetch(`${baseUrl}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let errorCode: string | undefined
    let errorMessage: string | undefined
    try {
      const parsed = (await response.json()) as unknown
      const hasDetail = (value: unknown): value is { detail?: ChatErrorResponse } =>
        typeof value === 'object' && value !== null && 'detail' in value
      let detail: ChatErrorResponse | undefined
      if (hasDetail(parsed) && parsed.detail) {
        detail = parsed.detail
      } else {
        detail = parsed as ChatErrorResponse
      }
      errorCode = detail?.errorCode
      errorMessage = detail?.errorMessage
    } catch {
      // ignore
    }
    const code = errorCode ?? 'chat_request_failed'
    const message =
      errorMessage ??
      (response.status === 500
        ? 'Zen chat backend may not be running. Run `npm run dev` from the project root to start both frontend and backend.'
        : `Chat request failed with status ${response.status.toString()}`)
    throw new Error(`${code}: ${message}`)
  }

  const body = response.body
  if (!body) throw new Error('chat_request_failed: No response body')

  for await (const event of parseSSEStream(body)) {
    const type = event.type as string | undefined
    if (type === 'content' && typeof event.delta === 'string') {
      callbacks.onChunk(event.delta)
    } else if (type === 'done') {
      const id = typeof event.id === 'string' ? event.id : ''
      const messageId = typeof event.messageId === 'string' ? event.messageId : ''
      const citations = Array.isArray(event.citations) ? event.citations : undefined
      callbacks.onDone({ id, messageId, citations })
      return
    } else if (type === 'error') {
      const errorCode = typeof event.errorCode === 'string' ? event.errorCode : 'chat_service_error'
      const errorMessage =
        typeof event.errorMessage === 'string' ? event.errorMessage : 'An error occurred'
      callbacks.onError?.({ errorCode, errorMessage })
      throw new Error(`${errorCode}: ${errorMessage}`)
    }
  }
}

