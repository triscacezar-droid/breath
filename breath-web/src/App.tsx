import './App.css'
import { useEffect, useRef, useState } from 'react'

type Phase = 'INHALE' | 'HOLD_TOP' | 'EXHALE' | 'HOLD_BOTTOM'

/** 0 = off, 1 = visible on tap, 2 = always visible */
type VisibilityMode = 0 | 1 | 2

const DEFAULT_DURATIONS: Record<Phase, number> = {
  INHALE: 5,
  HOLD_TOP: 5,
  EXHALE: 5,
  HOLD_BOTTOM: 5,
}

const MIN_SCALE = 0.01
const MAX_SCALE = 0.5

function easeInOut(t: number) {
  const p = Math.max(0, Math.min(1, t))
  return p * p * (3 - 2 * p)
}

function lerpScale(t: number) {
  return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * easeInOut(t)
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
  const [textVisibility, setTextVisibility] = useState<VisibilityMode>(0)
  const [dotsVisibility, setDotsVisibility] = useState<VisibilityMode>(0)
  const [sphereVisibility, setSphereVisibility] = useState<VisibilityMode>(2)
  const [textVisibilityAnimated, setTextVisibilityAnimated] = useState(0)
  const [dotsVisibilityAnimated, setDotsVisibilityAnimated] = useState(0)
  const [sphereVisibilityAnimated, setSphereVisibilityAnimated] = useState(2)
  const [labelAnimating, setLabelAnimating] = useState(false)
  const [prevLabel, setPrevLabel] = useState<string>(() => phaseLabel('INHALE'))
  const [editingDuration, setEditingDuration] = useState<Partial<Record<Phase, string>>>({})

  const intervalRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)
  const sliderLerpRef = useRef<number | null>(null)
  const draggingSliderRef = useRef<'text' | 'dots' | 'sphere' | null>(null)
  const firstChangeAfterDownRef = useRef(true)
  const hideInfoTimeoutRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('INHALE')
  const secondsLeftRef = useRef<number>(DEFAULT_DURATIONS.INHALE)
  const phaseStartTimeRef = useRef<number>(performance.now())
  const durationsRef = useRef<Record<Phase, number>>(durations)

  const [scale, setScale] = useState<number>(MIN_SCALE)

  const label = phaseLabel(phase)
  const textVisible = textVisibility === 2 || (textVisibility === 1 && showInfo)
  const dotsVisible = dotsVisibility === 2 || (dotsVisibility === 1 && showInfo)
  const sphereVisible = sphereVisibility === 2 || (sphereVisibility === 1 && showInfo)

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
        desiredScale = lerpScale(1)
      } else if (currentPhase === 'HOLD_BOTTOM') {
        desiredScale = lerpScale(0)
      } else {
        const clampedElapsed = Math.max(0, Math.min(phaseDuration, elapsed))
        const progress =
          phaseDuration === 0 ? 0 : clampedElapsed / phaseDuration

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
    const LERP = 0.2
    const EPS = 0.01
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
    const clamped = Math.max(0, Math.min(60, Math.round(n)))
    setDurations((d) => ({ ...d, [p]: clamped }))
    setEditingDuration((prev) => {
      const next = { ...prev }
      delete next[p]
      return next
    })
  }

  const durationDisplayValue = (p: Phase) =>
    editingDuration[p] !== undefined ? editingDuration[p] : String(durations[p])

  const handleDurationChange = (p: Phase, value: string) => {
    setEditingDuration((prev) => ({ ...prev, [p]: value }))
  }

  const handleDurationBlur = (p: Phase) => {
    const s = editingDuration[p]
    if (s === undefined) return
    const n = parseInt(s, 10)
    setDurations((d) => ({ ...d, [p]: Number.isNaN(n) ? 0 : Math.max(0, Math.min(60, n)) }))
    setEditingDuration((prev) => {
      const next = { ...prev }
      delete next[p]
      return next
    })
  }

  return (
    <main className="app">
      <aside className={`settings ${showSettings ? 'settings--open' : ''}`} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} aria-label="Breathing settings" aria-hidden={!showSettings}>
        <h2 className="settings-title">Timing (seconds)</h2>
        <label className="settings-row">
          <span>Inhale</span>
          <div className="settings-duration-wrap">
            <button type="button" className="settings-duration-btn" onClick={() => setDuration('INHALE', Math.max(0, durations.INHALE - 1))} aria-label="Decrease inhale">−</button>
            <input
              type="text"
              inputMode="numeric"
              value={durationDisplayValue('INHALE')}
              onChange={(e) => handleDurationChange('INHALE', e.target.value.replace(/\D/g, '').slice(0, 2))}
              onBlur={() => handleDurationBlur('INHALE')}
            />
            <button type="button" className="settings-duration-btn" onClick={() => setDuration('INHALE', Math.min(60, durations.INHALE + 1))} aria-label="Increase inhale">+</button>
          </div>
        </label>
        <label className="settings-row">
          <span>Hold (top)</span>
          <div className="settings-duration-wrap">
            <button type="button" className="settings-duration-btn" onClick={() => setDuration('HOLD_TOP', Math.max(0, durations.HOLD_TOP - 1))} aria-label="Decrease hold top">−</button>
            <input
              type="text"
              inputMode="numeric"
              value={durationDisplayValue('HOLD_TOP')}
              onChange={(e) => handleDurationChange('HOLD_TOP', e.target.value.replace(/\D/g, '').slice(0, 2))}
              onBlur={() => handleDurationBlur('HOLD_TOP')}
            />
            <button type="button" className="settings-duration-btn" onClick={() => setDuration('HOLD_TOP', Math.min(60, durations.HOLD_TOP + 1))} aria-label="Increase hold top">+</button>
          </div>
        </label>
        <label className="settings-row">
          <span>Exhale</span>
          <div className="settings-duration-wrap">
            <button type="button" className="settings-duration-btn" onClick={() => setDuration('EXHALE', Math.max(0, durations.EXHALE - 1))} aria-label="Decrease exhale">−</button>
            <input
              type="text"
              inputMode="numeric"
              value={durationDisplayValue('EXHALE')}
              onChange={(e) => handleDurationChange('EXHALE', e.target.value.replace(/\D/g, '').slice(0, 2))}
              onBlur={() => handleDurationBlur('EXHALE')}
            />
            <button type="button" className="settings-duration-btn" onClick={() => setDuration('EXHALE', Math.min(60, durations.EXHALE + 1))} aria-label="Increase exhale">+</button>
          </div>
        </label>
        <label className="settings-row">
          <span>Hold (bottom)</span>
          <div className="settings-duration-wrap">
            <button type="button" className="settings-duration-btn" onClick={() => setDuration('HOLD_BOTTOM', Math.max(0, durations.HOLD_BOTTOM - 1))} aria-label="Decrease hold bottom">−</button>
            <input
              type="text"
              inputMode="numeric"
              value={durationDisplayValue('HOLD_BOTTOM')}
              onChange={(e) => handleDurationChange('HOLD_BOTTOM', e.target.value.replace(/\D/g, '').slice(0, 2))}
              onBlur={() => handleDurationBlur('HOLD_BOTTOM')}
            />
            <button type="button" className="settings-duration-btn" onClick={() => setDuration('HOLD_BOTTOM', Math.min(60, durations.HOLD_BOTTOM + 1))} aria-label="Increase hold bottom">+</button>
          </div>
        </label>
        <h2 className="settings-title">Visibility</h2>
        <div className="settings-row settings-row--slider">
          <span className="settings-slider-label">Text</span>
          <div className="settings-slider-wrap">
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={textVisibilityAnimated}
              onPointerDown={() => { draggingSliderRef.current = 'text'; firstChangeAfterDownRef.current = true }}
              onPointerUp={() => { draggingSliderRef.current = null }}
              onPointerLeave={() => { draggingSliderRef.current = null }}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setTextVisibility(Math.round(v) as VisibilityMode)
                if (draggingSliderRef.current === 'text') {
                  if (firstChangeAfterDownRef.current) {
                    firstChangeAfterDownRef.current = false
                    /* don't set animated on first change – let RAF animate (avoids snap on click) */
                  } else setTextVisibilityAnimated(v)
                }
              }}
              aria-label="Phase text visibility"
              className="settings-slider"
            />
            <div className="settings-slider-labels" aria-hidden>
              <span>Off</span>
              <span>On tap</span>
              <span>On</span>
            </div>
          </div>
        </div>
        <div className="settings-row settings-row--slider">
          <span className="settings-slider-label">Dots</span>
          <div className="settings-slider-wrap">
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={dotsVisibilityAnimated}
              onPointerDown={() => { draggingSliderRef.current = 'dots'; firstChangeAfterDownRef.current = true }}
              onPointerUp={() => { draggingSliderRef.current = null }}
              onPointerLeave={() => { draggingSliderRef.current = null }}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setDotsVisibility(Math.round(v) as VisibilityMode)
                if (draggingSliderRef.current === 'dots') {
                  if (firstChangeAfterDownRef.current) {
                    firstChangeAfterDownRef.current = false
                    /* don't set animated on first change – let RAF animate (avoids snap on click) */
                  } else setDotsVisibilityAnimated(v)
                }
              }}
              aria-label="Dots visibility"
              className="settings-slider"
            />
            <div className="settings-slider-labels" aria-hidden>
              <span>Off</span>
              <span>On tap</span>
              <span>On</span>
            </div>
          </div>
        </div>
        <div className="settings-row settings-row--slider">
          <span className="settings-slider-label">Sphere</span>
          <div className="settings-slider-wrap">
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={sphereVisibilityAnimated}
              onPointerDown={() => { draggingSliderRef.current = 'sphere'; firstChangeAfterDownRef.current = true }}
              onPointerUp={() => { draggingSliderRef.current = null }}
              onPointerLeave={() => { draggingSliderRef.current = null }}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setSphereVisibility(Math.round(v) as VisibilityMode)
                if (draggingSliderRef.current === 'sphere') {
                  if (firstChangeAfterDownRef.current) {
                    firstChangeAfterDownRef.current = false
                    /* don't set animated on first change – let RAF animate (avoids snap on click) */
                  } else setSphereVisibilityAnimated(v)
                }
              }}
              aria-label="Sphere visibility"
              className="settings-slider"
            />
            <div className="settings-slider-labels" aria-hidden>
              <span>Off</span>
              <span>On tap</span>
              <span>On</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="content-wrap" onClick={handleUserInteract} onTouchStart={handleUserInteract}>
        {(showInfo || textVisibility === 2 || dotsVisibility === 2 || sphereVisibility === 2) && (
          <button type="button" className="settings-trigger" onClick={(e) => { e.stopPropagation(); setShowSettings(true) }} onTouchStart={(e) => e.stopPropagation()} aria-label="Open settings">
            <span className="settings-trigger-icon" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
        )}
      <section className="session" aria-label="Breathing session">
        <div className="status-slot" aria-hidden={!textVisible && !dotsVisible}>
          <div className={`status ${textVisible ? 'status--visible' : 'status--hidden'}`}>
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
          </div>
          <div className={`phase-dots-wrap ${dotsVisible ? 'phase-dots-wrap--visible' : 'phase-dots-wrap--hidden'}`}>
            <PhaseDots
              phase={phase}
              duration={durations[phase]}
              secondsLeft={secondsLeft}
            />
          </div>
        </div>

        <div
            className={`circle ${sphereVisible ? 'circle--visible' : 'circle--hidden'}`}
            data-phase={phase}
            style={{
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
          />
      </section>
      <footer className={`cycles-footer ${textVisible || dotsVisible ? 'cycles-footer--visible' : 'cycles-footer--hidden'}`} aria-hidden={!textVisible && !dotsVisible}>
        {cycleCount} cycles completed
      </footer>
      </div>
    </main>
  )
}

export default App
