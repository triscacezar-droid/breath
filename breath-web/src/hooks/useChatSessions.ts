import { useCallback, useState } from 'react'
import type { ChatMessage, ChatSession } from '../types/chat'
import { ZEN_CHAT_HISTORY_KEY, ZEN_CHAT_SESSIONS_KEY } from '../constants'

function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'New chat'
  return first.content.length > 42 ? first.content.slice(0, 42) + '…' : first.content
}

function makeSession(messages: ChatMessage[] = []): ChatSession {
  return {
    id: crypto.randomUUID(),
    title: deriveTitle(messages) || 'New chat',
    createdAt: new Date().toISOString(),
    messages,
  }
}

interface SessionsState {
  sessions: ChatSession[]
  activeId: string
}

function loadState(): SessionsState {
  try {
    const raw = localStorage.getItem(ZEN_CHAT_SESSIONS_KEY)
    if (raw) {
      const parsed: SessionsState = JSON.parse(raw)
      if (Array.isArray(parsed.sessions) && parsed.sessions.length) return parsed
    }
  } catch { /* ignore */ }

  // Migrate legacy single-session history.
  try {
    const legacy = localStorage.getItem(ZEN_CHAT_HISTORY_KEY)
    if (legacy) {
      const messages: ChatMessage[] = JSON.parse(legacy)
      if (Array.isArray(messages) && messages.length) {
        const session = makeSession(messages)
        return { sessions: [session], activeId: session.id }
      }
    }
  } catch { /* ignore */ }

  const session = makeSession()
  return { sessions: [session], activeId: session.id }
}

function persist(state: SessionsState): void {
  try {
    localStorage.setItem(ZEN_CHAT_SESSIONS_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

export function useChatSessions() {
  const [state, setState] = useState<SessionsState>(loadState)

  const activeSession = state.sessions.find((s) => s.id === state.activeId) ?? state.sessions[0]

  const selectSession = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev, activeId: id }
      persist(next)
      return next
    })
  }, [])

  const createSession = useCallback(() => {
    const session = makeSession()
    setState((prev) => {
      const next = { sessions: [session, ...prev.sessions], activeId: session.id }
      persist(next)
      return next
    })
    return session
  }, [])

  const updateMessages = useCallback((id: string, messages: ChatMessage[]) => {
    setState((prev) => {
      const sessions = prev.sessions.map((s) =>
        s.id === id ? { ...s, messages, title: deriveTitle(messages) || s.title } : s
      )
      const next = { ...prev, sessions }
      persist(next)
      return next
    })
  }, [])

  const deleteSession = useCallback((id: string) => {
    setState((prev) => {
      let sessions = prev.sessions.filter((s) => s.id !== id)
      let activeId = prev.activeId
      if (!sessions.length) {
        const fresh = makeSession()
        sessions = [fresh]
        activeId = fresh.id
      } else if (activeId === id) {
        activeId = sessions[0].id
      }
      const next = { sessions, activeId }
      persist(next)
      return next
    })
  }, [])

  return { sessions: state.sessions, activeSession, selectSession, createSession, updateMessages, deleteSession }
}
