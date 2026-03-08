import { useEffect, useRef } from 'react'
import { DOUBLE_TAP_WINDOW_MS, SETTINGS_CLOSE_DEBOUNCE_MS } from '../constants'

export function useTapHandlers(
  showSettings: boolean,
  setShowSettings: (v: boolean) => void,
  setShowInfo: (v: boolean) => void
) {
  const lastTapTimeRef = useRef<number>(0)
  const singleTapTimeoutRef = useRef<number | null>(null)
  const lastClosedByDoubleTapRef = useRef<number>(0)

  const handleUserInteract = () => {
    if (showSettings) {
      lastClosedByDoubleTapRef.current = Date.now()
      setShowSettings(false)
      return
    }
    setShowInfo(true)
  }

  const handleDoubleTapOrDoubleClick = () => {
    if (showSettings) {
      lastClosedByDoubleTapRef.current = Date.now()
      setShowSettings(false)
      return
    }
    if (Date.now() - lastClosedByDoubleTapRef.current < SETTINGS_CLOSE_DEBOUNCE_MS) {
      return
    }
    setShowSettings(true)
  }

  const handleContentClick = () => {
    handleUserInteract()
  }

  const handleContentTouchStart = () => {
    const now = Date.now()
    if (singleTapTimeoutRef.current !== null) {
      window.clearTimeout(singleTapTimeoutRef.current)
      singleTapTimeoutRef.current = null
    }
    if (now - lastTapTimeRef.current < DOUBLE_TAP_WINDOW_MS) {
      lastTapTimeRef.current = 0
      handleDoubleTapOrDoubleClick()
      return
    }
    lastTapTimeRef.current = now
    singleTapTimeoutRef.current = window.setTimeout(() => {
      singleTapTimeoutRef.current = null
      handleUserInteract()
    }, DOUBLE_TAP_WINDOW_MS)
  }

  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current !== null) {
        window.clearTimeout(singleTapTimeoutRef.current)
      }
    }
  }, [])

  return { handleContentClick, handleContentTouchStart, handleDoubleTapOrDoubleClick }
}
