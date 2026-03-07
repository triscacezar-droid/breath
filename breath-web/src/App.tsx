import './App.css'
import { useEffect, useMemo, useRef, useState } from 'react'

type Phase = 'INHALE' | 'HOLD' | 'EXHALE'

const DURATIONS_S: Record<Phase, number> = {
  INHALE: 4,
  HOLD: 4,
  EXHALE: 4,
}

function nextPhase(phase: Phase): Phase {
  switch (phase) {
    case 'INHALE':
      return 'HOLD'
    case 'HOLD':
      return 'EXHALE'
    case 'EXHALE':
      return 'INHALE'
  }
}

function phaseLabel(phase: Phase) {
  switch (phase) {
    case 'INHALE':
      return 'Breathe in'
    case 'HOLD':
      return 'Hold'
    case 'EXHALE':
      return 'Breathe out'
  }
}

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [phase, setPhase] = useState<Phase>('INHALE')
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS_S.INHALE)
  const [cycleCount, setCycleCount] = useState(0)

  const intervalRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('INHALE')
  const secondsLeftRef = useRef<number>(DURATIONS_S.INHALE)

  const duration = DURATIONS_S[phase]
  const label = phaseLabel(phase)

  const targetScale = useMemo(() => {
    switch (phase) {
      case 'INHALE':
      case 'HOLD':
        return 1
      case 'EXHALE':
        return 0.6
    }
  }, [phase])

  const transitionSeconds = useMemo(() => {
    switch (phase) {
      case 'INHALE':
      case 'EXHALE':
        return duration
      case 'HOLD':
        return 0.2
    }
  }, [phase, duration])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    secondsLeftRef.current = secondsLeft
  }, [secondsLeft])

  useEffect(() => {
    if (!isRunning) return

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
      if (currentPhase === 'EXHALE' && next === 'INHALE') {
        setCycleCount((c) => c + 1)
      }

      phaseRef.current = next
      setPhase(next)

      const nextDuration = DURATIONS_S[next]
      secondsLeftRef.current = nextDuration
      setSecondsLeft(nextDuration)
    }, 1000)

    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [isRunning])

  function onToggleRun() {
    setIsRunning((r) => !r)
  }

  function onReset() {
    setIsRunning(false)
    setPhase('INHALE')
    setSecondsLeft(DURATIONS_S.INHALE)
    setCycleCount(0)
    phaseRef.current = 'INHALE'
    secondsLeftRef.current = DURATIONS_S.INHALE
  }

  return (
    <main className="app">
      <header className="header">
        <h1 className="title">Breath</h1>
        <p className="subtitle">A simple 4–4–4 breathing cycle</p>
      </header>

      <section className="session" aria-label="Breathing session">
        <div
          className="circle"
          data-phase={phase}
          style={{
            transform: `scale(${isRunning ? targetScale : 0.6})`,
            transitionDuration: `${isRunning ? transitionSeconds : 0.2}s`,
          }}
        />

        <div className="status">
          <div className="phase">{label}</div>
          <div className="timer">
            <span className="seconds">{secondsLeft}</span>
            <span className="secondsUnit">s</span>
          </div>
          <div className="meta">Cycles completed: {cycleCount}</div>
        </div>
      </section>

      <section className="controls" aria-label="Controls">
        <button className="primary" onClick={onToggleRun}>
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button className="secondary" onClick={onReset}>
          Reset
        </button>
      </section>
    </main>
  )
}

export default App
