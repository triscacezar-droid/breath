import { useEffect, useRef, useState } from 'react'
import { SLOT_ANIMATION_MS } from '../constants'

export function SlotInput({
  value,
  onChange,
  onBlur,
  disabled,
  inputMode = 'numeric',
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
  disabled: boolean
  inputMode?: 'numeric' | 'text'
  'aria-label'?: string
}) {
  const [prevValue, setPrevValue] = useState(value)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'up' | 'down'>('up')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value !== prevValue && !focused) {
      const prevNum = parseInt(prevValue, 10)
      const nextNum = parseInt(value, 10)
      if (!Number.isNaN(prevNum) && !Number.isNaN(nextNum)) {
        setDirection(nextNum > prevNum ? 'up' : 'down')
        setAnimating(true)
        const t = window.setTimeout(() => {
          setPrevValue(value)
          setAnimating(false)
        }, SLOT_ANIMATION_MS)
        return () => window.clearTimeout(t)
      }
    }
    setPrevValue(value)
  }, [value, focused])

  return (
    <div className={`slot-input ${focused ? 'slot-input--focused' : ''}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        onBlur={() => {
          setFocused(false)
          onBlur()
        }}
        onFocus={() => setFocused(true)}
        disabled={disabled}
        className="slot-input__field"
        aria-label={ariaLabel}
      />
      <div
        className={`slot-input__display ${focused ? 'slot-input__display--hidden' : ''}`}
        onClick={() => !disabled && inputRef.current?.focus()}
        aria-hidden={focused}
      >
        {animating ? (
          <>
            <div className={`slot-input__in slot-input__in--${direction}`}>{value}</div>
            <div className={`slot-input__out slot-input__out--${direction}`}>{prevValue}</div>
          </>
        ) : (
          <div className="slot-input__value">{value}</div>
        )}
      </div>
    </div>
  )
}

export function SlotDisplay({
  value,
  rank,
  'aria-label': ariaLabel,
  className,
}: {
  value: string
  rank?: number
  'aria-label'?: string
  className?: string
}) {
  const [prevValue, setPrevValue] = useState(value)
  const [prevRank, setPrevRank] = useState(rank)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'up' | 'down'>('up')

  useEffect(() => {
    if (value !== prevValue) {
      const prevNum = parseFloat(prevValue)
      const nextNum = parseFloat(value)
      const useRank = rank !== undefined && prevRank !== undefined
      const useNumeric = !Number.isNaN(prevNum) && !Number.isNaN(nextNum)
      if (useRank || useNumeric) {
        setDirection(useRank ? (rank! > prevRank! ? 'up' : 'down') : nextNum > prevNum ? 'up' : 'down')
        setPrevRank(rank)
        setAnimating(true)
        const t = window.setTimeout(() => {
          setPrevValue(value)
          setPrevRank(rank)
          setAnimating(false)
        }, SLOT_ANIMATION_MS)
        return () => window.clearTimeout(t)
      }
      setPrevValue(value)
      setPrevRank(rank)
    }
  }, [value, rank])

  return (
    <div className={`slot-input slot-input--readonly ${className ?? ''}`}>
      <div className="slot-input__display" aria-label={ariaLabel} aria-live="polite">
        {animating ? (
          <>
            <div className={`slot-input__in slot-input__in--${direction}`}>{value}</div>
            <div className={`slot-input__out slot-input__out--${direction}`}>{prevValue}</div>
          </>
        ) : (
          <div className="slot-input__value">{value}</div>
        )}
      </div>
    </div>
  )
}
