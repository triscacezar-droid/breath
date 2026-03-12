import type { ChatRequest, ChatResponse, ChatErrorResponse } from '../types/chat'

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = (await response.json()) as { detail?: ChatErrorResponse } | ChatErrorResponse
      const detail = 'detail' in parsed && parsed.detail ? parsed.detail : parsed
      errorCode = detail?.errorCode
      errorMessage = detail?.errorMessage
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data = await response.json()
  return data as ChatResponse
}

