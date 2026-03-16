import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage } from '../types/chat'
import { useZenChat, STREAMING_PLACEHOLDER_ID } from '../hooks/useZenChat'
import { useChatSessions } from '../hooks/useChatSessions'
import { SettingsDropdown } from './SettingsDropdown'
import { CHAT_MODELS, DEFAULT_CHAT_MODEL_ID, ZEN_CHAT_MODEL_KEY } from '../constants'
import type { ChatModelId } from '../constants'

const ZEN_CHAT_WIDTH_KEY = 'zen-chat-width'
const ZEN_CHAT_MIN_WIDTH = 240
const ZEN_CHAT_MAX_WIDTH = 600
const ZEN_CHAT_DEFAULT_WIDTH = 320
const ZEN_CHAT_WIDE_BREAKPOINT = 641

export interface ZenChatPanelProps {
  isOpen: boolean
  onClose: () => void
}

function useIsWideViewport(): boolean {
  const [isWide, setIsWide] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= ZEN_CHAT_WIDE_BREAKPOINT
  )
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${ZEN_CHAT_WIDE_BREAKPOINT}px)`)
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches)
    setIsWide(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isWide
}

function usePanelWidth(): [number, (w: number) => void] {
  const [width, setWidth] = useState(() => {
    try {
      const stored = localStorage.getItem(ZEN_CHAT_WIDTH_KEY)
      if (stored) {
        const n = parseInt(stored, 10)
        if (!Number.isNaN(n) && n >= ZEN_CHAT_MIN_WIDTH && n <= ZEN_CHAT_MAX_WIDTH) return n
      }
    } catch {
      /* ignore */
    }
    return ZEN_CHAT_DEFAULT_WIDTH
  })
  const setAndStore = useCallback((w: number) => {
    const maxWidth = typeof window !== 'undefined' ? window.innerWidth : ZEN_CHAT_MAX_WIDTH
    const clamped = Math.round(Math.max(ZEN_CHAT_MIN_WIDTH, Math.min(maxWidth, w)))
    setWidth(clamped)
    try {
      localStorage.setItem(ZEN_CHAT_WIDTH_KEY, String(clamped))
    } catch {
      /* ignore */
    }
  }, [])
  return [width, setAndStore]
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function groupMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
}

/** Render a string with **bold** and *italic* markdown as React nodes. */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

export function ZenChatPanel({ isOpen, onClose }: ZenChatPanelProps) {
  const [selectedModel, setSelectedModel] = useState<ChatModelId>(() => {
    try {
      const stored = localStorage.getItem(ZEN_CHAT_MODEL_KEY)
      if (stored && CHAT_MODELS.some((m) => m.value === stored)) return stored as ChatModelId
    } catch { /* ignore */ }
    return DEFAULT_CHAT_MODEL_ID
  })
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [showSessions, setShowSessions] = useState(false)

  const { sessions, activeSession, selectSession, createSession, updateMessages, deleteSession } =
    useChatSessions()

  const { messages, isLoading, error, send, reset } = useZenChat(
    activeSession.id,
    selectedModel,
    activeSession.id,
    activeSession.messages,
  )

  // Keep session storage in sync with live messages.
  useEffect(() => {
    const finalized = messages.filter((m) => m.id !== STREAMING_PLACEHOLDER_ID)
    updateMessages(activeSession.id, finalized)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  const [input, setInput] = useState('')
  const isWide = useIsWideViewport()
  const [panelWidth, setPanelWidth] = usePanelWidth()
  const [, setKeyboardOffset] = useState(0)

  const grouped = useMemo(() => groupMessages(messages), [messages])

  const bodyRef = useRef<HTMLDivElement>(null)
  const userHasControl = useRef(false)

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = panelWidth
      const onMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX
        setPanelWidth(startWidth + delta)
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [panelWidth, setPanelWidth]
  )

  const handleModelChange = useCallback((value: ChatModelId) => {
    setSelectedModel(value)
    try { localStorage.setItem(ZEN_CHAT_MODEL_KEY, value) } catch { /* ignore */ }
    reset()
  }, [reset])

  // Pause auto-scroll when the user scrolls up manually.
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 32
      if (!atBottom) userHasControl.current = true
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Auto-scroll to bottom while streaming, unless the user has taken control.
  useEffect(() => {
    if (userHasControl.current) return
    const el = bodyRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, isLoading])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = input.trim()
    if (!value) return
    userHasControl.current = false
    setInput('')
    await send(value)
  }

  const handleSelectSession = useCallback((id: string) => {
    selectSession(id)
    setShowSessions(false)
    userHasControl.current = false
  }, [selectSession])

  const handleNewChat = useCallback(() => {
    createSession()
    setShowSessions(false)
    userHasControl.current = false
  }, [createSession])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const viewport = window.visualViewport
    if (!viewport || !isOpen) return

    const updateOffset = () => {
      const windowHeight = window.innerHeight
      const viewportHeight = viewport.height
      const offsetTop = viewport.offsetTop ?? 0
      const rawKeyboard = windowHeight - viewportHeight - offsetTop
      const next = rawKeyboard > 80 ? rawKeyboard : 0
      setKeyboardOffset(next)
      document.documentElement.style.setProperty('--zen-chat-keyboard-offset', `${next}px`)
    }

    updateOffset()
    viewport.addEventListener('resize', updateOffset)
    viewport.addEventListener('scroll', updateOffset)
    return () => {
      viewport.removeEventListener('resize', updateOffset)
      viewport.removeEventListener('scroll', updateOffset)
      document.documentElement.style.removeProperty('--zen-chat-keyboard-offset')
    }
  }, [isOpen])

  const style: React.CSSProperties = isWide ? { width: panelWidth } : {}

  return (
    <aside
      className={`zen-chat ${isOpen ? 'zen-chat--open' : ''} ${!isWide ? 'zen-chat--full' : ''}`}
      style={style}
      aria-label="Zen chat"
      aria-hidden={!isOpen}
    >
      {isWide && isOpen && (
        <div
          className="zen-chat__resize-handle"
          onMouseDown={handleResizeStart}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
        />
      )}
      <div className="zen-chat__header">
        <div className="zen-chat__header-info">
          <div className="zen-chat__title">
            {showSessions ? 'Chats' : 'Zen companion'}
          </div>
          {!showSessions && (
            <div className="zen-chat__subtitle">Short reflections, calm and grounded.</div>
          )}
        </div>
        <div className="zen-chat__header-controls">
          {!showSessions && (
            <div className="zen-chat__model-picker">
              <SettingsDropdown
                options={CHAT_MODELS}
                selected={selectedModel}
                onSelect={handleModelChange}
                ariaLabel="Select AI model"
                triggerLabel={CHAT_MODELS.find((m) => m.value === selectedModel)?.label ?? selectedModel}
                isOpen={modelDropdownOpen}
                onOpenChange={setModelDropdownOpen}
              />
            </div>
          )}
          <button
            type="button"
            className="zen-chat__header-btn"
            onClick={() => setShowSessions((v) => !v)}
            aria-label={showSessions ? 'Back to chat' : 'Show chats'}
          >
            {showSessions ? '←' : '☰'}
          </button>
          <button
            type="button"
            className="zen-chat__header-btn"
            onClick={onClose}
            aria-label="Close Zen chat"
          >
            ×
          </button>
        </div>
      </div>

      {showSessions ? (
        <div className="zen-chat__sessions">
          <button
            type="button"
            className="zen-chat__sessions-new"
            onClick={handleNewChat}
          >
            + New chat
          </button>
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`zen-chat__session-item ${session.id === activeSession.id ? 'zen-chat__session-item--active' : ''}`}
            >
              <button
                type="button"
                className="zen-chat__session-main"
                onClick={() => handleSelectSession(session.id)}
              >
                <span className="zen-chat__session-title">{session.title}</span>
                <span className="zen-chat__session-meta">
                  {formatDate(session.createdAt)} · {session.messages.length} msg{session.messages.length !== 1 ? 's' : ''}
                </span>
              </button>
              <button
                type="button"
                className="zen-chat__session-delete"
                onClick={() => deleteSession(session.id)}
                aria-label="Delete chat"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="zen-chat__body" ref={bodyRef}>
            {grouped.length === 0 && !isLoading && !error && (
              <div className="zen-chat__hint">
                Ask a gentle question, or share how your breath feels. The reply will be brief, like a
                koan.
              </div>
            )}
            {grouped.map((message) => (
              <div
                key={message.id}
                className={`zen-chat__bubble zen-chat__bubble--${message.role === 'user' ? 'user' : 'assistant'}`}
              >
                <div className="zen-chat__bubble-content">
                  {renderInlineMarkdown(message.content)}
                  {isLoading &&
                    message.role === 'assistant' &&
                    message.id === STREAMING_PLACEHOLDER_ID && (
                      <span className="zen-chat__cursor" aria-hidden="true" />
                    )}
                </div>
                <div className="zen-chat__bubble-meta">
                  <span>{message.role === 'user' ? 'You' : 'Zen'}</span>
                  {message.createdAt && <span>· {formatTime(message.createdAt)}</span>}
                </div>
              </div>
            ))}
            {isLoading &&
              !(
                grouped[grouped.length - 1]?.role === 'assistant' &&
                grouped[grouped.length - 1]?.id === STREAMING_PLACEHOLDER_ID
              ) && (
                <div className="zen-chat__bubble zen-chat__bubble--assistant">
                  <div className="zen-chat__bubble-content">
                    <span className="zen-chat__dot" />
                    <span className="zen-chat__dot" />
                    <span className="zen-chat__dot" />
                  </div>
                </div>
              )}
            {error && <div className="zen-chat__error">{error}</div>}
          </div>
          <form className="zen-chat__footer" onSubmit={handleSubmit} autoComplete="off">
            <button
              type="button"
              className="zen-chat__secondary"
              onClick={reset}
              aria-label="Reset Zen conversation"
            >
              Reset
            </button>
            <div className="zen-chat__input-wrap">
              <input
                className="zen-chat__input"
                type="text"
                name="zen-chat-message"
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="text"
                value={input}
                onChange={(event) => {
                  userHasControl.current = true
                  setInput(event.target.value)
                }}
                placeholder={'\u201cWhat is this breath?\u201d'}
                aria-label="Message Zen companion"
              />
            </div>
            <button type="submit" className="zen-chat__primary" disabled={isLoading}>
              Send
            </button>
          </form>
        </>
      )}
    </aside>
  )
}
