import { useEffect, useRef, useState } from 'react'
import type { Phase } from '../types'
import { DEFAULT_DURATIONS } from '../constants'
import { nextPhase } from '../utils'

const TEXT_TRANSITION_MS = 700

export function useBreathTimer(durationsRef: React.MutableRefObject<Record<Phase, number>>) {
  const [phase, setPhase] = useState<Phase>('INHALE')
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DURATIONS.INHALE)
  const [cycleCount, setCycleCount] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [prevPhase, setPrevPhase] = useState<Phase>('INHALE')
  const [labelAnimating, setLabelAnimating] = useState(false)

  const intervalRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('INHALE')
  const secondsLeftRef = useRef<number>(DEFAULT_DURATIONS.INHALE)
  const phaseStartTimeRef = useRef<number>(performance.now())
  const sessionStartTimeRef = useRef<number>(performance.now())
  const cycleCountRef = useRef(0)
  const elapsedSecondsRef = useRef(0)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  useEffect(() => {
    cycleCountRef.current = cycleCount
  }, [cycleCount])
  useEffect(() => {
    secondsLeftRef.current = secondsLeft
  }, [secondsLeft])
  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds
  }, [elapsedSeconds])

  useEffect(() => {
    if (!labelAnimating) return
    const timeout = window.setTimeout(() => {
      setLabelAnimating(false)
    }, TEXT_TRANSITION_MS)
    return () => window.clearTimeout(timeout)
  }, [labelAnimating])

  useEffect(() => {
    const tick = () => {
      const currentPhase = phaseRef.current
      const phaseDuration = durationsRef.current[currentPhase]
      const elapsed = (performance.now() - phaseStartTimeRef.current) / 1000
      const currentLeft = Math.max(0, Math.ceil(phaseDuration - elapsed))
      const sessionElapsed = Math.floor((performance.now() - sessionStartTimeRef.current) / 1000)

      if (currentLeft !== secondsLeftRef.current) {
        secondsLeftRef.current = currentLeft
        setSecondsLeft(currentLeft)
      }
      if (sessionElapsed !== elapsedSecondsRef.current) {
        elapsedSecondsRef.current = sessionElapsed
        setElapsedSeconds(sessionElapsed)
      }

      if (elapsed < phaseDuration) {
        return
      }

      let next = nextPhase(currentPhase)
      let lastDisplayedPhase = currentPhase

      /* Skip zero-duration phases completely */
      for (let i = 0; i < 4 && durationsRef.current[next] === 0; i++) {
        if (lastDisplayedPhase === 'HOLD_BOTTOM' && next === 'INHALE') {
          const newC = cycleCountRef.current + 1
          cycleCountRef.current = newC
          setCycleCount(newC)
        }
        lastDisplayedPhase = next
        next = nextPhase(next)
      }

      if (lastDisplayedPhase === 'HOLD_BOTTOM' && next === 'INHALE') {
        const newC = cycleCountRef.current + 1
        cycleCountRef.current = newC
        setCycleCount(newC)
      }

      setPrevPhase(currentPhase)
      phaseRef.current = next
      setLabelAnimating(true)
      setPhase(next)
      phaseStartTimeRef.current = performance.now()

      const nextDuration = durationsRef.current[next]
      secondsLeftRef.current = nextDuration
      setSecondsLeft(nextDuration)
    }

    intervalRef.current = window.setInterval(tick, 100)

    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [durationsRef])

  function resetToInhale() {
    phaseRef.current = 'INHALE'
    cycleCountRef.current = 0
    setPhase('INHALE')
    setPrevPhase('INHALE')
    setCycleCount(0)
    setLabelAnimating(false)
  }

  function reset() {
    const d = durationsRef.current
    let firstPhase: Phase = 'INHALE'
    for (let i = 0; i < 4; i++) {
      if (d[firstPhase] > 0) break
      firstPhase = nextPhase(firstPhase)
    }
    const firstDuration = d[firstPhase]
    phaseRef.current = firstPhase
    secondsLeftRef.current = firstDuration
    cycleCountRef.current = 0
    phaseStartTimeRef.current = performance.now()
    sessionStartTimeRef.current = performance.now()
    setPhase(firstPhase)
    setSecondsLeft(firstDuration)
    setCycleCount(0)
    setElapsedSeconds(0)
    setLabelAnimating(false)
    setPrevPhase(firstPhase)
  }

  return {
    phase,
    cycleCount,
    elapsedSeconds,
    prevPhase,
    labelAnimating,
    resetToInhale,
    reset,
    phaseRef,
    cycleCountRef,
    phaseStartTimeRef,
  }
}
