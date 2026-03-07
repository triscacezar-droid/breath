import './App.css'
import { useEffect, useRef, useState } from 'react'

type Phase = 'INHALE' | 'HOLD_TOP' | 'EXHALE' | 'HOLD_BOTTOM'

const DURATIONS_S: Record<Phase, number> = {
  INHALE: 4,
  HOLD_TOP: 4,
  EXHALE: 4,
  HOLD_BOTTOM: 4,
}

const MIN_SCALE = 0.7
const MAX_SCALE = 1.25

function lerpVolumeScale(t: number) {
  const p = Math.max(0, Math.min(1, t))
  const min3 = MIN_SCALE ** 3
  const max3 = MAX_SCALE ** 3
  const vol = min3 + (max3 - min3) * p
  return Math.cbrt(vol)
}

function nextPhase(phase: Phase): Phase {
  switch (phase) {
    case 'INHALE':
      return 'HOLD_TOP'
    case 'HOLD_TOP':
      return 'EXHALE'
    case 'EXHALE':
      return 'HOLD_BOTTOM'
    case 'HOLD_BOTTOM':
      return 'INHALE'
  }
}

function phaseLabel(phase: Phase) {
  switch (phase) {
    case 'INHALE':
      return 'Breathe in'
    case 'HOLD_TOP':
      return 'Hold'
    case 'EXHALE':
      return 'Breathe out'
    case 'HOLD_BOTTOM':
      return 'Hold'
  }
}

function App() {
  const [phase, setPhase] = useState<Phase>('INHALE')
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS_S.INHALE)
  const [cycleCount, setCycleCount] = useState(0)

  const intervalRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('INHALE')
  const secondsLeftRef = useRef<number>(DURATIONS_S.INHALE)
  const phaseStartTimeRef = useRef<number>(performance.now())

  const [scale, setScale] = useState<number>(MIN_SCALE)

  const label = phaseLabel(phase)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    secondsLeftRef.current = secondsLeft
  }, [secondsLeft])

  useEffect(() => {
    const animate = () => {
      const currentPhase = phaseRef.current
      const phaseDuration = DURATIONS_S[currentPhase]
      const elapsed =
        (performance.now() - phaseStartTimeRef.current) / 1000

      if (currentPhase === 'HOLD_TOP') {
        setScale(lerpVolumeScale(1))
      } else if (currentPhase === 'HOLD_BOTTOM') {
        setScale(lerpVolumeScale(0))
      } else {
        const clampedElapsed = Math.max(0, Math.min(phaseDuration, elapsed))
        const progress =
          phaseDuration === 0 ? 0 : clampedElapsed / phaseDuration

        if (currentPhase === 'INHALE') {
          setScale(lerpVolumeScale(progress))
        } else if (currentPhase === 'EXHALE') {
          setScale(lerpVolumeScale(1 - progress))
        }
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

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      const currentPhase = phaseRef.current
      const currentLeft = secondsLeftRef.current

      if (currentLeft > 1) {
        const nextLeft = currentLeft - 1
        secondsLeftRef.current = nextLeft
        setSecondsLeft(nextLeft)
        return
      }

      const next = nextPhase(currentPhase)
      if (currentPhase === 'HOLD_BOTTOM' && next === 'INHALE') {
        setCycleCount((c) => c + 1)
      }

      phaseRef.current = next
      setPhase(next)
      phaseStartTimeRef.current = performance.now()

      const nextDuration = DURATIONS_S[next]
      secondsLeftRef.current = nextDuration
      setSecondsLeft(nextDuration)
    }, 1000)

    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  return (
    <main className="app">
      <section className="session" aria-label="Breathing session">
        <div className="status">
          <div className="phase">{label}</div>
          <div className="timer">
            <span className="seconds">{secondsLeft}</span>
            <span className="secondsUnit">s</span>
          </div>
          <div className="meta">Cycles completed: {cycleCount}</div>
        </div>

        <div
          className="circle"
          data-phase={phase}
          style={{
            transform: `scale(${scale})`,
          }}
        />
      </section>
    </main>
  )
}

export default App
