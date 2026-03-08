import { useEffect, useRef } from 'react'
import type { Phase, BreathMode } from '../types'
import { INITIAL_DELAY_MS, SETTINGS_TRANSITION_TOTAL_MS } from '../constants'

export function useSessionOrchestration(
  durationsRef: React.MutableRefObject<Record<Phase, number>>,
  breathModeRef: React.MutableRefObject<BreathMode>,
  durations: Record<Phase, number>,
  breathMode: BreathMode,
  timingMode: string,
  multiplierSeconds: number,
  setInitialDelayPassed: (v: boolean) => void,
  setContentRevealed: (v: boolean) => void,
  setShowInfo: (v: boolean) => void,
  setContentTransitionOpacity: (v: number) => void,
  resetToInhale: () => void,
  reset: () => void,
  restartAnimation: () => void,
  phaseStartTimeRef: React.MutableRefObject<number>
) {
  const transitionInProgressRef = useRef(false)
  const pendingDurationsRef = useRef<Record<Phase, number> | null>(null)
  const pendingBreathModeRef = useRef<BreathMode | null>(null)
  const hasContentBeenRevealedRef = useRef(false)

  /* Initial delay, then reveal content */
  useEffect(() => {
    const t = window.setTimeout(() => {
      setInitialDelayPassed(true)
      setContentRevealed(true)
      setShowInfo(true)
      hasContentBeenRevealedRef.current = true
      phaseStartTimeRef.current = performance.now()
      restartAnimation()
    }, INITIAL_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [restartAnimation])

  /* On settings change (after initial reveal): fade out, reset, fade in */
  useEffect(() => {
    if (!hasContentBeenRevealedRef.current) return
    transitionInProgressRef.current = true
    setContentTransitionOpacity(0)
    const t = window.setTimeout(() => {
      if (pendingDurationsRef.current) {
        durationsRef.current = pendingDurationsRef.current
        pendingDurationsRef.current = null
      }
      if (pendingBreathModeRef.current !== null) {
        breathModeRef.current = pendingBreathModeRef.current
        pendingBreathModeRef.current = null
      }
      transitionInProgressRef.current = false
      resetToInhale()
      reset()
      restartAnimation()
      setContentTransitionOpacity(1)
      setShowInfo(true)
    }, SETTINGS_TRANSITION_TOTAL_MS)
    return () => window.clearTimeout(t)
  }, [
    timingMode,
    multiplierSeconds,
    breathMode,
    durations.INHALE,
    durations.HOLD_TOP,
    durations.EXHALE,
    durations.HOLD_BOTTOM,
  ])

  /* Sync durationsRef; during transition, store pending */
  useEffect(() => {
    if (transitionInProgressRef.current) {
      pendingDurationsRef.current = durations
      return
    }
    durationsRef.current = durations
  }, [durations])

  /* Sync breathModeRef; during transition, store pending */
  useEffect(() => {
    if (transitionInProgressRef.current) {
      pendingBreathModeRef.current = breathMode
      return
    }
    breathModeRef.current = breathMode
  }, [breathMode])
}
