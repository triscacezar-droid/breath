import { useCallback, useMemo, useState } from 'react'
import type { ChatCitation, ChatMessage } from '../types/chat'
import { sendChatMessageStream } from '../lib/chatClient'

interface UseZenChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  send: (content: string) => Promise<void>
  reset: () => void
}

export const STREAMING_PLACEHOLDER_ID = 'assistant-streaming'

export function useZenChat(initialSessionId?: string): UseZenChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionId = useMemo(() => initialSessionId ?? crypto.randomUUID(), [initialSessionId])

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed) return

      setError(null)

      const userMessage: ChatMessage = {
        id: `user-${Date.now().toString()}`,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      }

      const placeholder: ChatMessage = {
        id: STREAMING_PLACEHOLDER_ID,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      }
      const nextMessages: ChatMessage[] = [...messages, userMessage, placeholder]
      setMessages(nextMessages)
      setIsLoading(true)

      try {
        await sendChatMessageStream(
          { sessionId, messages: [...messages, userMessage] },
          {
            onChunk: (delta: string) => {
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                if (!last || last.role !== 'assistant' || last.id !== STREAMING_PLACEHOLDER_ID)
                  return prev
                return [...prev.slice(0, -1), { ...last, content: last.content + delta }]
              })
            },
            onDone: (payload) => {
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                const content =
                  last?.id === STREAMING_PLACEHOLDER_ID && last?.content
                    ? last.content.trim() || '…'
                    : '…'
                const filtered = prev.filter((m) => m.id !== STREAMING_PLACEHOLDER_ID)
                const citations = payload.citations as ChatCitation[] | undefined
                const final: ChatMessage = {
                  id: payload.messageId,
                  role: 'assistant',
                  content,
                  createdAt: new Date().toISOString(),
                  ...(citations?.length ? { citations } : {}),
                }
                return [...filtered, final]
              })
            },
            onError: (payload) => {
              setMessages((prev) => prev.filter((m) => m.id !== STREAMING_PLACEHOLDER_ID))
              setError(`${payload.errorCode}: ${payload.errorMessage}`)
            },
          }
        )
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== STREAMING_PLACEHOLDER_ID))
        const raw = err instanceof Error ? err.message : 'Unable to reach Zen chat right now.'
        const isNetworkError =
          /failed to fetch|networkerror|network error|connection refused/i.test(raw)
        const message = isNetworkError
          ? 'Unable to connect to Zen chat. Run `npm run dev` from the project root to start the backend.'
          : raw
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [messages, sessionId]
  )

  const reset = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    send,
    reset,
  }
}

