import { useMemo, useState } from 'react'
import type { ChatMessage } from '../types/chat'
import { useZenChat } from '../hooks/useZenChat'

export interface ZenChatPanelProps {
  isOpen: boolean
  onClose: () => void
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

  const grouped = useMemo(() => groupMessages(messages), [messages])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = input.trim()
    if (!value) return
    await send(value)
    setInput('')
  }

  return (
    <aside
      className={`zen-chat ${isOpen ? 'zen-chat--open' : ''}`}
      aria-label="Zen chat"
      aria-hidden={!isOpen}
    >
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

