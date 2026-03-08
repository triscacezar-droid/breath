import { useEffect, useRef, useState } from 'react'
import type { VisibilityMode } from '../types'

const LERP = 0.2
const EPS = 0.01

type SliderId = 'text' | 'dots' | 'sphere'

export function useVisibilityLerp(
  textVisibility: VisibilityMode,
  dotsVisibility: VisibilityMode,
  sphereVisibility: VisibilityMode,
  setTextVisibility: (v: VisibilityMode) => void,
  setDotsVisibility: (v: VisibilityMode) => void,
  setSphereVisibility: (v: VisibilityMode) => void
) {
  const [textVisibilityAnimated, setTextVisibilityAnimated] = useState<number>(textVisibility)
  const [dotsVisibilityAnimated, setDotsVisibilityAnimated] = useState<number>(dotsVisibility)
  const [sphereVisibilityAnimated, setSphereVisibilityAnimated] = useState<number>(sphereVisibility)

  const sliderLerpRef = useRef<number | null>(null)
  const draggingSliderRef = useRef<SliderId | null>(null)
  const sliderChangeCountRef = useRef(0)

  useEffect(() => {
    const tick = () => {
      setTextVisibilityAnimated((prev) => {
        if (draggingSliderRef.current === 'text') return prev
        const target = textVisibility
        const next = prev + (target - prev) * LERP
        return Math.abs(next - target) < EPS ? target : next
      })
      setDotsVisibilityAnimated((prev) => {
        if (draggingSliderRef.current === 'dots') return prev
        const target = dotsVisibility
        const next = prev + (target - prev) * LERP
        return Math.abs(next - target) < EPS ? target : next
      })
      setSphereVisibilityAnimated((prev) => {
        if (draggingSliderRef.current === 'sphere') return prev
        const target = sphereVisibility
        const next = prev + (target - prev) * LERP
        return Math.abs(next - target) < EPS ? target : next
      })
      sliderLerpRef.current = window.requestAnimationFrame(tick)
    }
    sliderLerpRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (sliderLerpRef.current !== null) {
        window.cancelAnimationFrame(sliderLerpRef.current)
        sliderLerpRef.current = null
      }
    }
  }, [textVisibility, dotsVisibility, sphereVisibility])

  const setters: Record<SliderId, (v: VisibilityMode) => void> = {
    text: setTextVisibility,
    dots: setDotsVisibility,
    sphere: setSphereVisibility,
  }

  const animatedSetters: Record<SliderId, (v: number) => void> = {
    text: (v) => setTextVisibilityAnimated(v),
    dots: (v) => setDotsVisibilityAnimated(v),
    sphere: (v) => setSphereVisibilityAnimated(v),
  }

  function getSliderHandlers(id: SliderId) {
    return {
      onPointerDown: () => {
        draggingSliderRef.current = id
        sliderChangeCountRef.current = 0
      },
      onPointerUp: () => {
        draggingSliderRef.current = null
      },
      onPointerLeave: () => {
        draggingSliderRef.current = null
      },
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = parseFloat(e.target.value)
        setters[id](Math.round(v) as VisibilityMode)
        if (draggingSliderRef.current === id) {
          sliderChangeCountRef.current += 1
          if (sliderChangeCountRef.current >= 2) {
            animatedSetters[id](v)
          }
        }
      },
    }
  }

  return {
    textVisibilityAnimated,
    dotsVisibilityAnimated,
    sphereVisibilityAnimated,
    setTextVisibilityAnimated,
    setDotsVisibilityAnimated,
    setSphereVisibilityAnimated,
    getSliderHandlers,
  }
}
