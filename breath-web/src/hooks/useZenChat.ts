import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChatCitation, ChatMessage } from '../types/chat'
import { sendChatMessageStream } from '../lib/chatClient'
import { DEFAULT_CHAT_MODEL_ID } from '../constants'
import type { ChatModelId } from '../constants'

interface UseZenChatState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  send: (content: string) => Promise<void>
  reset: () => void
}

export const STREAMING_PLACEHOLDER_ID = 'assistant-streaming'

export function useZenChat(
  initialSessionId?: string,
  model: ChatModelId = DEFAULT_CHAT_MODEL_ID,
  sessionKey?: string,
  initialMessages: ChatMessage[] = [],
): UseZenChatState {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sessionId = useMemo(() => initialSessionId ?? crypto.randomUUID(), [initialSessionId])

  // Reset messages when the active session changes.
  useEffect(() => {
    setMessages(initialMessages)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey])

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
          { sessionId, messages: [...messages, userMessage], model },
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
    [messages, sessionId, model]
  )

  const reset = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return { messages, isLoading, error, send, reset }
}
