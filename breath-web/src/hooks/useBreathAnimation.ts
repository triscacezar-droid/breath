import { useCallback, useEffect, useRef, useState } from 'react'
import type { Phase, BreathMode } from '../types'
import { MIN_SCALE } from '../constants'
import { easeInOut, lerpScale } from '../utils'

const ANULOM_LEFT = 42
const ANULOM_CENTER = 50
const ANULOM_RIGHT = 58

function getAnulomInitialLeft(phase: Phase, cycleCount: number): number {
  if (phase === 'INHALE') return cycleCount % 2 === 0 ? ANULOM_LEFT : ANULOM_RIGHT
  if (phase === 'HOLD_TOP') return ANULOM_CENTER
  if (phase === 'EXHALE') return ANULOM_CENTER
  return cycleCount % 2 === 0 ? ANULOM_RIGHT : ANULOM_LEFT
}

export function useBreathAnimation(
  phaseRef: React.MutableRefObject<Phase>,
  durationsRef: React.MutableRefObject<Record<Phase, number>>,
  phaseStartTimeRef: React.MutableRefObject<number>,
  breathModeRef: React.MutableRefObject<BreathMode>,
  cycleCountRef: React.MutableRefObject<number>,
  contentRevealed: boolean
) {
  const [scale, setScale] = useState<number>(MIN_SCALE)
  const [sphereAnulomLeft, setSphereAnulomLeft] = useState<number>(ANULOM_CENTER)
  const animationRef = useRef<number | null>(null)
  const restartRequestedRef = useRef(false)

  /** Resets the sphere to exact initial size and position. Call when settings change or session restarts. */
  const restart = useCallback(() => {
    restartRequestedRef.current = true
    const phase = phaseRef.current
    const cycleCount = cycleCountRef.current
    const initialLeft =
      breathModeRef.current === 'anulom_vilom'
        ? getAnulomInitialLeft(phase, cycleCount)
        : ANULOM_CENTER
    setScale(MIN_SCALE)
    setSphereAnulomLeft(initialLeft)
  }, [])

  /* When sphere spawns (content revealed), restart so it starts at smallest size */
  useEffect(() => {
    if (contentRevealed) {
      restart()
    }
  }, [contentRevealed, restart])

  useEffect(() => {
    const animate = () => {
      const justRestarted = restartRequestedRef.current
      if (justRestarted) {
        restartRequestedRef.current = false
        setScale(MIN_SCALE)
        const phase = phaseRef.current
        const cycleCount = cycleCountRef.current
        const initialLeft =
          breathModeRef.current === 'anulom_vilom'
            ? getAnulomInitialLeft(phase, cycleCount)
            : ANULOM_CENTER
        setSphereAnulomLeft(initialLeft)
      }

      const currentPhase = phaseRef.current
      const phaseDuration = durationsRef.current[currentPhase]
      const elapsed = (performance.now() - phaseStartTimeRef.current) / 1000

      if (!justRestarted) {
        let desiredScale: number

        if (currentPhase === 'HOLD_TOP') {
          desiredScale = lerpScale(1)
        } else if (currentPhase === 'HOLD_BOTTOM') {
          desiredScale = lerpScale(0)
        } else {
          const clampedElapsed = Math.max(0, Math.min(phaseDuration, elapsed))
          const progress = phaseDuration === 0 ? 0 : clampedElapsed / phaseDuration

          if (currentPhase === 'INHALE') {
            desiredScale = lerpScale(progress)
          } else if (currentPhase === 'EXHALE') {
            desiredScale = lerpScale(1 - progress)
          } else {
            desiredScale = MIN_SCALE
          }
        }

        setScale(desiredScale)
      }

      if (breathModeRef.current === 'anulom_vilom' && !justRestarted) {
        const cc = cycleCountRef.current
        const leftSide = ANULOM_LEFT
        const center = ANULOM_CENTER
        const rightSide = ANULOM_RIGHT
        const clampedElapsed = Math.max(0, Math.min(phaseDuration, elapsed))
        const progress = phaseDuration === 0 ? 0 : clampedElapsed / phaseDuration
        const easedProgress = easeInOut(progress)
        let desiredLeft: number
        if (currentPhase === 'INHALE') {
          desiredLeft =
            cc % 2 === 0
              ? leftSide + (center - leftSide) * easedProgress
              : rightSide + (center - rightSide) * easedProgress
        } else if (currentPhase === 'HOLD_TOP') {
          desiredLeft = center
        } else if (currentPhase === 'EXHALE') {
          desiredLeft =
            cc % 2 === 0
              ? center + (rightSide - center) * easedProgress
              : center + (leftSide - center) * easedProgress
        } else {
          desiredLeft = cc % 2 === 0 ? rightSide : leftSide
        }
        setSphereAnulomLeft(desiredLeft)
      }

      animationRef.current = window.requestAnimationFrame(animate)
    }

    animationRef.current = window.requestAnimationFrame(animate)

    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [])

  return { scale, sphereAnulomLeft, restart }
}
