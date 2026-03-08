import { useEffect, useRef, useState } from 'react'

const SHOW_DELAY_MS = 600
const FADE_DURATION_MS = 500
const HIDE_DELAY_MS = 200
const STACK_REMOVE_DELAY_MS = FADE_DURATION_MS + HIDE_DELAY_MS

function useDelayedVisibility(
  visible: boolean,
  affectsStack: boolean
): { display: boolean; stack: boolean } {
  const [display, setDisplay] = useState(visible)
  const [stack, setStack] = useState(visible)
  const showTimeoutRef = useRef<number | null>(null)
  const stackTimeoutRef = useRef<number | null>(null)
  const isInitialMountRef = useRef(true)

  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      setDisplay(visible)
      if (affectsStack) setStack(visible)
      return
    }

    if (visible) {
      /* Turning ON: stack updates immediately (layout arranges), display after 0.2s */
      if (affectsStack) {
        if (stackTimeoutRef.current !== null) {
          window.clearTimeout(stackTimeoutRef.current)
          stackTimeoutRef.current = null
        }
        setStack(true)
      }
      showTimeoutRef.current = window.setTimeout(() => {
        showTimeoutRef.current = null
        setDisplay(true)
      }, SHOW_DELAY_MS)
    } else {
      /* Turning OFF: display hides immediately (fade starts), stack removes after fade + 0.2s */
      setDisplay(false)
      if (affectsStack) {
        stackTimeoutRef.current = window.setTimeout(() => {
          stackTimeoutRef.current = null
          setStack(false)
        }, STACK_REMOVE_DELAY_MS)
      }
    }

    return () => {
      if (showTimeoutRef.current !== null) {
        window.clearTimeout(showTimeoutRef.current)
        showTimeoutRef.current = null
      }
      if (stackTimeoutRef.current !== null) {
        window.clearTimeout(stackTimeoutRef.current)
        stackTimeoutRef.current = null
      }
    }
  }, [visible, affectsStack])

  return {
    display,
    stack: affectsStack ? stack : visible,
  }
}

export function useVisibilityWithDelays(visible: {
  text: boolean
  dots: boolean
  sphere: boolean
  cycles: boolean
}) {
  const text = useDelayedVisibility(visible.text, true)
  const dots = useDelayedVisibility(visible.dots, true)
  const sphere = useDelayedVisibility(visible.sphere, true)
  const cycles = useDelayedVisibility(visible.cycles, false)

  return {
    displayTextVisible: text.display,
    displayDotsVisible: dots.display,
    displaySphereVisible: sphere.display,
    displayCyclesVisible: cycles.display,
    stackTextVisible: text.stack,
    stackDotsVisible: dots.stack,
    stackSphereVisible: sphere.stack,
  }
}
