import { useEffect, useRef, useState } from 'react'
import type { Phase, BreathMode } from '../types'
import { MIN_SCALE } from '../constants'
import { easeInOut, lerpScale } from '../utils'

export function useBreathAnimation(
  phaseRef: React.MutableRefObject<Phase>,
  durationsRef: React.MutableRefObject<Record<Phase, number>>,
  phaseStartTimeRef: React.MutableRefObject<number>,
  breathModeRef: React.MutableRefObject<BreathMode>,
  cycleCountRef: React.MutableRefObject<number>,
  contentRevealed: boolean
) {
  const [scale, setScale] = useState<number>(MIN_SCALE)
  const [sphereAnulomLeft, setSphereAnulomLeft] = useState<number>(50)
  const animationRef = useRef<number | null>(null)

  /* When sphere spawns (content revealed), start at smallest size since we begin with inhale */
  useEffect(() => {
    if (contentRevealed) {
      setScale(MIN_SCALE)
    }
  }, [contentRevealed])

  useEffect(() => {
    const animate = () => {
      const currentPhase = phaseRef.current
      const phaseDuration = durationsRef.current[currentPhase]
      const elapsed = (performance.now() - phaseStartTimeRef.current) / 1000

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

      setScale((prev) => {
        const smoothing = 0.03
        return prev + (desiredScale - prev) * smoothing
      })

      if (breathModeRef.current === 'anulom_vilom') {
        const cc = cycleCountRef.current
        const leftSide = 35
        const center = 50
        const rightSide = 65
        const clampedElapsed = Math.max(0, Math.min(phaseDuration, elapsed))
        const progress = phaseDuration === 0 ? 0 : clampedElapsed / phaseDuration
        let desiredLeft: number
        if (currentPhase === 'INHALE') {
          desiredLeft =
            cc % 2 === 0
              ? leftSide + (center - leftSide) * easeInOut(progress)
              : rightSide + (center - rightSide) * easeInOut(progress)
        } else if (currentPhase === 'HOLD_TOP') {
          desiredLeft = center
        } else if (currentPhase === 'EXHALE') {
          desiredLeft =
            cc % 2 === 0
              ? center + (rightSide - center) * easeInOut(progress)
              : center + (leftSide - center) * easeInOut(progress)
        } else {
          desiredLeft = cc % 2 === 0 ? rightSide : leftSide
        }
        setSphereAnulomLeft((prev) => {
          const smoothing = 0.08
          return prev + (desiredLeft - prev) * smoothing
        })
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

  return { scale, sphereAnulomLeft }
}
