import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChatMessage } from '../types/chat'
import { useZenChat } from '../hooks/useZenChat'

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
    const clamped = Math.round(Math.max(ZEN_CHAT_MIN_WIDTH, Math.min(ZEN_CHAT_MAX_WIDTH, w)))
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

function groupMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
}

export function ZenChatPanel({ isOpen, onClose }: ZenChatPanelProps) {
  const { messages, isLoading, error, send, reset } = useZenChat()
  const [input, setInput] = useState('')
  const isWide = useIsWideViewport()
  const [panelWidth, setPanelWidth] = usePanelWidth()

  const grouped = useMemo(() => groupMessages(messages), [messages])

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = input.trim()
    if (!value) return
    await send(value)
    setInput('')
  }

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
        <div>
          <div className="zen-chat__title">Zen companion</div>
          <div className="zen-chat__subtitle">Short reflections, calm and grounded.</div>
        </div>
        <button
          type="button"
          className="zen-chat__header-btn"
          onClick={onClose}
          aria-label="Close Zen chat"
        >
          ×
        </button>
      </div>
      <div className="zen-chat__body">
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
            <div className="zen-chat__bubble-content">{message.content}</div>
            <div className="zen-chat__bubble-meta">
              <span>{message.role === 'user' ? 'You' : 'Zen'}</span>
              {message.createdAt && <span>· {formatTime(message.createdAt)}</span>}
            </div>
          </div>
        ))}
        {isLoading && (
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
      <form className="zen-chat__footer" onSubmit={handleSubmit}>
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
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="“What is this breath?”"
            aria-label="Message Zen companion"
          />
        </div>
        <button type="submit" className="zen-chat__primary" disabled={isLoading}>
          Send
        </button>
      </form>
    </aside>
  )
}

