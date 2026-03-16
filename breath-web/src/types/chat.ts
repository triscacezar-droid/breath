export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  citations?: ChatCitation[]
}

export interface ChatCitation {
  id: string
  title: string
  source: string
  url?: string
  snippet: string
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  messages: ChatMessage[]
}

export interface ChatRequest {
  sessionId?: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  model?: string
}

export interface ChatResponse {
  id: string
  message: ChatMessage
  citations?: ChatCitation[]
}

export interface ChatErrorResponse {
  errorCode: string
  errorMessage: string
}

export interface ChatStreamDonePayload {
  id: string
  messageId: string
  citations?: ChatCitation[]
}

export interface ChatStreamErrorPayload {
  errorCode: string
  errorMessage: string
}

export interface ChatStreamCallbacks {
  onChunk: (delta: string) => void
  onDone: (payload: ChatStreamDonePayload) => void
  onError?: (payload: ChatStreamErrorPayload) => void
}

