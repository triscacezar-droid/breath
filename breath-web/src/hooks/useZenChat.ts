import { useCallback, useMemo, useState } from 'react'
import type { ChatMessage } from '../types/chat'
import { sendChatMessage } from '../lib/chatClient'

interface UseZenChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  send: (content: string) => Promise<void>
  reset: () => void
}

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

      const nextMessages = [...messages, userMessage]
      setMessages(nextMessages)
      setIsLoading(true)

      try {
        const response = await sendChatMessage({
          sessionId,
          messages: nextMessages,
        })
        setMessages((current) => [...current, response.message])
      } catch (err) {
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

