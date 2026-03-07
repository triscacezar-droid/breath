import './App.css'
import { useEffect, useRef, useState } from 'react'

type Phase = 'INHALE' | 'HOLD_TOP' | 'EXHALE' | 'HOLD_BOTTOM'

const DEFAULT_DURATIONS: Record<Phase, number> = {
  INHALE: 5,
  HOLD_TOP: 5,
  EXHALE: 5,
  HOLD_BOTTOM: 5,
}

const MIN_SCALE = 0.5
const MAX_SCALE = 1

function lerpAreaScale(t: number) {
  const p = Math.max(0, Math.min(1, t))
  const min2 = MIN_SCALE ** 2
  const max2 = MAX_SCALE ** 2
  const area = min2 + (max2 - min2) * p
  return Math.sqrt(area)
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

function PhaseDots({ phase, duration, secondsLeft }: { phase: Phase; duration: number; secondsLeft: number }) {
  const elapsedSeconds = Math.max(0, Math.min(duration, duration - secondsLeft))
  const dots = Array.from({ length: duration }, (_, i) => i)

  return (
    <div className="phase-dots" aria-hidden>
      {dots.map((i) => {
        let visible = true
        let isYellow = false

        switch (phase) {
          case 'INHALE':
            visible = i < elapsedSeconds
            isYellow = false
            break
          case 'HOLD_TOP':
            visible = true
            isYellow = i < elapsedSeconds
            break
          case 'EXHALE':
            visible = true
            isYellow = i >= elapsedSeconds
            break
          case 'HOLD_BOTTOM':
            visible = i >= elapsedSeconds
            isYellow = false
            break
        }

        return (
          <span
            key={i}
            className={`phase-dot ${visible ? 'phase-dot--visible' : ''} ${isYellow ? 'phase-dot--yellow' : 'phase-dot--white'}`}
          />
        )
      })}
    </div>
  )
}

function App() {
  const [durations, setDurations] = useState<Record<Phase, number>>(() => ({ ...DEFAULT_DURATIONS }))
  const [phase, setPhase] = useState<Phase>('INHALE')
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DURATIONS.INHALE)
  const [cycleCount, setCycleCount] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [labelAnimating, setLabelAnimating] = useState(false)
  const [prevLabel, setPrevLabel] = useState<string>(() => phaseLabel('INHALE'))

  const intervalRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)
  const hideInfoTimeoutRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('INHALE')
  const secondsLeftRef = useRef<number>(DEFAULT_DURATIONS.INHALE)
  const phaseStartTimeRef = useRef<number>(performance.now())
  const durationsRef = useRef<Record<Phase, number>>(durations)

  const [scale, setScale] = useState<number>(MIN_SCALE)

  const label = phaseLabel(phase)

  useEffect(() => {
    if (!showInfo) return

    if (hideInfoTimeoutRef.current !== null) {
      window.clearTimeout(hideInfoTimeoutRef.current)
    }

    hideInfoTimeoutRef.current = window.setTimeout(() => {
      setShowInfo(false)
    }, 10_000)

    return () => {
      if (hideInfoTimeoutRef.current !== null) {
        window.clearTimeout(hideInfoTimeoutRef.current)
        hideInfoTimeoutRef.current = null
      }
    }
  }, [showInfo])

  const TEXT_TRANSITION_MS = 700

  useEffect(() => {
    if (!labelAnimating) return
    const timeout = window.setTimeout(() => {
      setLabelAnimating(false)
    }, TEXT_TRANSITION_MS)
    return () => window.clearTimeout(timeout)
  }, [labelAnimating])

  useEffect(() => {
    durationsRef.current = durations
  }, [durations])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    secondsLeftRef.current = secondsLeft
  }, [secondsLeft])

  useEffect(() => {
    const animate = () => {
      const currentPhase = phaseRef.current
      const phaseDuration = durationsRef.current[currentPhase]
      const elapsed =
        (performance.now() - phaseStartTimeRef.current) / 1000

      let desiredScale: number

      if (currentPhase === 'HOLD_TOP') {
        desiredScale = lerpAreaScale(1)
      } else if (currentPhase === 'HOLD_BOTTOM') {
        desiredScale = lerpAreaScale(0)
      } else {
        const clampedElapsed = Math.max(0, Math.min(phaseDuration, elapsed))
        const progress =
          phaseDuration === 0 ? 0 : clampedElapsed / phaseDuration

        if (currentPhase === 'INHALE') {
          desiredScale = lerpAreaScale(progress)
        } else if (currentPhase === 'EXHALE') {
          desiredScale = lerpAreaScale(1 - progress)
        } else {
          desiredScale = MIN_SCALE
        }
      }

      setScale((prev) => {
        const smoothing = 0.03
        return prev + (desiredScale - prev) * smoothing
      })

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

      setPrevLabel(phaseLabel(currentPhase))
      phaseRef.current = next
      setLabelAnimating(true)
      setPhase(next)
      phaseStartTimeRef.current = performance.now()

      const nextDuration = durationsRef.current[next]
      secondsLeftRef.current = nextDuration
      setSecondsLeft(nextDuration)
    }, 1000)

    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const handleUserInteract = () => {
    if (showSettings) {
      setShowSettings(false)
      return
    }
    setShowInfo(true)
  }

  const setDuration = (p: Phase, value: number) => {
    const n = Number(value)
    if (Number.isNaN(n)) return
    const clamped = Math.max(1, Math.min(60, Math.round(n)))
    setDurations((d) => ({ ...d, [p]: clamped }))
  }

  return (
    <main className="app">
      <aside className={`settings ${showSettings ? 'settings--open' : ''}`} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} aria-label="Breathing settings" aria-hidden={!showSettings}>
        <h2 className="settings-title">Timing (seconds)</h2>
        <label className="settings-row">
          <span>Inhale</span>
          <input
            type="number"
            min={1}
            max={60}
            value={durations.INHALE}
            onChange={(e) => setDuration('INHALE', e.target.valueAsNumber)}
          />
        </label>
        <label className="settings-row">
          <span>Hold (top)</span>
          <input
            type="number"
            min={1}
            max={60}
            value={durations.HOLD_TOP}
            onChange={(e) => setDuration('HOLD_TOP', e.target.valueAsNumber)}
          />
        </label>
        <label className="settings-row">
          <span>Exhale</span>
          <input
            type="number"
            min={1}
            max={60}
            value={durations.EXHALE}
            onChange={(e) => setDuration('EXHALE', e.target.valueAsNumber)}
          />
        </label>
        <label className="settings-row">
          <span>Hold (bottom)</span>
          <input
            type="number"
            min={1}
            max={60}
            value={durations.HOLD_BOTTOM}
            onChange={(e) => setDuration('HOLD_BOTTOM', e.target.valueAsNumber)}
          />
        </label>
      </aside>
      <div className="content-wrap" onClick={handleUserInteract} onTouchStart={handleUserInteract}>
        {showInfo && (
          <button type="button" className="settings-trigger" onClick={(e) => { e.stopPropagation(); setShowSettings(true) }} onTouchStart={(e) => e.stopPropagation()} aria-label="Open settings">
            Settings
          </button>
        )}
      <section className="session" aria-label="Breathing session">
        <div className="status-slot" aria-hidden={!showInfo}>
          <div className={`status ${showInfo ? 'status--visible' : 'status--hidden'}`}>
          <div className="phase-stack">
            {labelAnimating ? (
              <>
                <div className="phase-row phase-out" key="out">{prevLabel}</div>
                <div className="phase-row phase-in" key="in">{label}</div>
              </>
            ) : (
              <div className="phase-row">{label}</div>
            )}
          </div>
          <PhaseDots
            phase={phase}
            duration={durations[phase]}
            secondsLeft={secondsLeft}
          />
          </div>
        </div>

        <div
          className="circle"
          data-phase={phase}
          style={{
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        />
      </section>
      <footer className={`cycles-footer ${showInfo ? 'cycles-footer--visible' : 'cycles-footer--hidden'}`} aria-hidden={!showInfo}>
        {cycleCount} cycles completed
      </footer>
      </div>
    </main>
  )
}

export default App
