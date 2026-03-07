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

const MIN_SCALE = 0.005
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
  /* ---------- Model ---------- */
  const [isBoxBreath, setIsBoxBreath] = useState(true)
  const [boxBreathSeconds, setBoxBreathSeconds] = useState(5)
  const [durations, setDurations] = useState<Record<Phase, number>>(() => ({ ...DEFAULT_DURATIONS }))
  const [phase, setPhase] = useState<Phase>('INHALE')
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DURATIONS.INHALE)
  const [cycleCount, setCycleCount] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [textVisibility, setTextVisibility] = useState<VisibilityMode>(2)
  const [dotsVisibility, setDotsVisibility] = useState<VisibilityMode>(0)
  const [sphereVisibility, setSphereVisibility] = useState<VisibilityMode>(2)
  const [cyclesVisibility, setCyclesVisibility] = useState<VisibilityMode>(1)
  const [textVisibilityAnimated, setTextVisibilityAnimated] = useState(2)
  const [dotsVisibilityAnimated, setDotsVisibilityAnimated] = useState(0)
  const [sphereVisibilityAnimated, setSphereVisibilityAnimated] = useState(2)
  const [cyclesVisibilityAnimated, setCyclesVisibilityAnimated] = useState(1)
  const [labelAnimating, setLabelAnimating] = useState(false)
  const [prevLabel, setPrevLabel] = useState<string>(() => phaseLabel('INHALE'))
  const [editingDuration, setEditingDuration] = useState<Partial<Record<Phase, string>>>({})
  const [editingBoxBreath, setEditingBoxBreath] = useState<string | undefined>(undefined)
  const [initialDelayPassed, setInitialDelayPassed] = useState(false)

  const intervalRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)
  const sliderLerpRef = useRef<number | null>(null)
  const draggingSliderRef = useRef<'text' | 'dots' | 'sphere' | 'cycles' | null>(null)
  const sliderChangeCountRef = useRef(0)
  const hideInfoTimeoutRef = useRef<number | null>(null)
  const phaseRef = useRef<Phase>('INHALE')
  const secondsLeftRef = useRef<number>(DEFAULT_DURATIONS.INHALE)
  const phaseStartTimeRef = useRef<number>(performance.now())
  const durationsRef = useRef<Record<Phase, number>>(durations)

  const [scale, setScale] = useState<number>(MIN_SCALE)

  /* ---------- Derived from model (view uses these) ---------- */
  const label = phaseLabel(phase)
  const textVisible = textVisibility === 2 || (textVisibility === 1 && showInfo)
  const dotsVisible = dotsVisibility === 2 || (dotsVisibility === 1 && showInfo)
  const sphereVisible = sphereVisibility === 2 || (sphereVisibility === 1 && showInfo)
  const cyclesVisible = cyclesVisibility === 2 || (cyclesVisibility === 1 && showInfo)

  /* ---------- Controller: 1.5s initial delay before showing anything ---------- */
  useEffect(() => {
    const t = window.setTimeout(() => setInitialDelayPassed(true), 1000)
    return () => window.clearTimeout(t)
  }, [])

  /* ---------- Controller: effects and actions that update the model ---------- */
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

  // When durations are not all equal, set dots slider to Off (controller updates model → view hides dots)
  useEffect(() => {
    const allEqual =
      durations.INHALE === durations.HOLD_TOP &&
      durations.HOLD_TOP === durations.EXHALE &&
      durations.EXHALE === durations.HOLD_BOTTOM
    if (!allEqual && dotsVisibility !== 0) {
      setDotsVisibility(0)
      setDotsVisibilityAnimated(0)
    }
  }, [durations, dotsVisibility])

  // Keep durations in sync when in box breath mode
  useEffect(() => {
    if (!isBoxBreath) return
    const v = Math.max(0, Math.min(60, boxBreathSeconds))
    setDurations(() => ({ INHALE: v, HOLD_TOP: v, EXHALE: v, HOLD_BOTTOM: v }))
  }, [isBoxBreath, boxBreathSeconds])

  // When switching to custom (expand), turn dots off and grey out
  useEffect(() => {
    if (!isBoxBreath) {
      setDotsVisibility(0)
      setDotsVisibilityAnimated(0)
    }
  }, [isBoxBreath])

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
      setCyclesVisibilityAnimated((prev) => {
        if (draggingSliderRef.current === 'cycles') return prev
        const target = cyclesVisibility
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
  }, [textVisibility, dotsVisibility, sphereVisibility, cyclesVisibility])

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

  const boxBreathDisplayValue = editingBoxBreath !== undefined ? editingBoxBreath : String(boxBreathSeconds)
  const handleBoxBreathChange = (value: string) => {
    setEditingBoxBreath(value.replace(/\D/g, '').slice(0, 2))
  }
  const handleBoxBreathBlur = () => {
    const s = editingBoxBreath
    if (s === undefined) return
    const n = parseInt(s, 10)
    const v = Number.isNaN(n) ? 0 : Math.max(0, Math.min(60, n))
    setBoxBreathSeconds(v)
    setEditingBoxBreath(undefined)
  }

  const expandCustom = () => setIsBoxBreath(false)
  const collapseCustom = () => {
    setBoxBreathSeconds(durations.INHALE)
    setIsBoxBreath(true)
  }

  /* ---------- View ---------- */
  return (
    <main className="app">
      <aside className={`settings ${showSettings ? 'settings--open' : ''}`} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} aria-label="Breathing settings" aria-hidden={!showSettings}>
        <h2 className="settings-title">Timing (seconds)</h2>
        <label className={`settings-row ${!isBoxBreath ? 'settings-row--disabled' : ''}`}>
          <span>Box breath</span>
          <div className="settings-duration-wrap">
            <button type="button" className="settings-duration-btn" disabled={!isBoxBreath} onClick={() => isBoxBreath && setBoxBreathSeconds((v) => Math.max(0, v - 1))} aria-label="Decrease box breath">−</button>
            <input
              type="text"
              inputMode="numeric"
              value={boxBreathDisplayValue}
              onChange={(e) => handleBoxBreathChange(e.target.value)}
              onBlur={handleBoxBreathBlur}
              disabled={!isBoxBreath}
            />
            <button type="button" className="settings-duration-btn" disabled={!isBoxBreath} onClick={() => isBoxBreath && setBoxBreathSeconds((v) => Math.min(60, v + 1))} aria-label="Increase box breath">+</button>
          </div>
        </label>
        <div className="settings-custom-wrap">
          <button type="button" className={`settings-custom-trigger ${isBoxBreath ? 'settings-custom-trigger--off' : ''}`} onClick={isBoxBreath ? expandCustom : collapseCustom} aria-expanded={!isBoxBreath} aria-controls="custom-timing">
            <span>Custom</span>
            <span className="settings-custom-chevron" aria-hidden>{isBoxBreath ? '▼' : '▲'}</span>
          </button>
          <div id="custom-timing" className={`settings-custom-panel ${isBoxBreath ? 'settings-custom-panel--closed' : ''}`} aria-hidden={isBoxBreath}>
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
          </div>
        </div>
        {/* ---------- View: visibility sliders (read/write model) ---------- */}
        <h2 className="settings-title">Visibility</h2>
        <div className="settings-row settings-row--slider">
          <span className="settings-slider-label">Text</span>
          <div className={`settings-slider-wrap ${Math.round(textVisibilityAnimated) === 0 ? 'settings-slider-wrap--off' : ''}`}>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={textVisibilityAnimated}
              onPointerDown={() => { draggingSliderRef.current = 'text'; sliderChangeCountRef.current = 0 }}
              onPointerUp={() => { draggingSliderRef.current = null }}
              onPointerLeave={() => { draggingSliderRef.current = null }}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setTextVisibility(Math.round(v) as VisibilityMode)
                if (draggingSliderRef.current === 'text') {
                  sliderChangeCountRef.current += 1
                  if (sliderChangeCountRef.current >= 2) setTextVisibilityAnimated(v)
                }
              }}
              aria-label="Phase text visibility"
              className={`settings-slider settings-slider--mode-${Math.round(textVisibilityAnimated)}`}
            />
            <div className="settings-slider-labels" aria-hidden>
              <span>Off</span>
              <span>On tap</span>
              <span>On</span>
            </div>
          </div>
        </div>
        <div className={`settings-row settings-row--slider ${!isBoxBreath ? 'settings-row--disabled' : ''}`}>
          <span className="settings-slider-label">Dots</span>
          <div className={`settings-slider-wrap ${Math.round(dotsVisibilityAnimated) === 0 ? 'settings-slider-wrap--off' : ''}`}>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={dotsVisibilityAnimated}
              disabled={!isBoxBreath}
              onPointerDown={() => { isBoxBreath && (draggingSliderRef.current = 'dots'); sliderChangeCountRef.current = 0 }}
              onPointerUp={() => { draggingSliderRef.current = null }}
              onPointerLeave={() => { draggingSliderRef.current = null }}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setDotsVisibility(Math.round(v) as VisibilityMode)
                if (draggingSliderRef.current === 'dots') {
                  sliderChangeCountRef.current += 1
                  if (sliderChangeCountRef.current >= 2) setDotsVisibilityAnimated(v)
                }
              }}
              aria-label="Dots visibility"
              className={`settings-slider settings-slider--mode-${Math.round(dotsVisibilityAnimated)}`}
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
          <div className={`settings-slider-wrap ${Math.round(sphereVisibilityAnimated) === 0 ? 'settings-slider-wrap--off' : ''}`}>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={sphereVisibilityAnimated}
              onPointerDown={() => { draggingSliderRef.current = 'sphere'; sliderChangeCountRef.current = 0 }}
              onPointerUp={() => { draggingSliderRef.current = null }}
              onPointerLeave={() => { draggingSliderRef.current = null }}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setSphereVisibility(Math.round(v) as VisibilityMode)
                if (draggingSliderRef.current === 'sphere') {
                  sliderChangeCountRef.current += 1
                  if (sliderChangeCountRef.current >= 2) setSphereVisibilityAnimated(v)
                }
              }}
              aria-label="Sphere visibility"
              className={`settings-slider settings-slider--mode-${Math.round(sphereVisibilityAnimated)}`}
            />
            <div className="settings-slider-labels" aria-hidden>
              <span>Off</span>
              <span>On tap</span>
              <span>On</span>
            </div>
          </div>
        </div>
        <div className="settings-row settings-row--slider">
          <span className="settings-slider-label">Cycles</span>
          <div className={`settings-slider-wrap ${Math.round(cyclesVisibilityAnimated) === 0 ? 'settings-slider-wrap--off' : ''}`}>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={cyclesVisibilityAnimated}
              onPointerDown={() => { draggingSliderRef.current = 'cycles'; sliderChangeCountRef.current = 0 }}
              onPointerUp={() => { draggingSliderRef.current = null }}
              onPointerLeave={() => { draggingSliderRef.current = null }}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setCyclesVisibility(Math.round(v) as VisibilityMode)
                if (draggingSliderRef.current === 'cycles') {
                  sliderChangeCountRef.current += 1
                  if (sliderChangeCountRef.current >= 2) setCyclesVisibilityAnimated(v)
                }
              }}
              aria-label="Cycles completed visibility"
              className={`settings-slider settings-slider--mode-${Math.round(cyclesVisibilityAnimated)}`}
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
        <div className={`content-inner ${initialDelayPassed ? 'content-inner--visible' : ''}`}>
        <button type="button" className={`settings-trigger ${showInfo && initialDelayPassed ? 'settings-trigger--visible' : ''}`} onClick={(e) => { e.stopPropagation(); setShowSettings(true) }} onTouchStart={(e) => e.stopPropagation()} aria-label="Open settings" aria-hidden={!showInfo || !initialDelayPassed}>
            <span className="settings-trigger-icon" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
      <section className="session" aria-label="Breathing session">
        <div className="status-slot" aria-hidden={!initialDelayPassed || (!textVisible && !dotsVisible)}>
          <div className={`status ${initialDelayPassed && textVisible ? 'status--visible' : 'status--hidden'}`}>
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
          <div className={`phase-dots-wrap ${initialDelayPassed && dotsVisible ? 'phase-dots-wrap--visible' : 'phase-dots-wrap--hidden'}`}>
            <PhaseDots
              phase={phase}
              duration={durations[phase]}
              secondsLeft={secondsLeft}
            />
          </div>
        </div>

        <div
            className={`circle ${initialDelayPassed && sphereVisible ? 'circle--visible' : 'circle--hidden'}`}
            data-phase={phase}
            style={{
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
          />
      </section>
      <footer className={`cycles-footer ${initialDelayPassed && cyclesVisible ? 'cycles-footer--visible' : 'cycles-footer--hidden'}`} aria-hidden={!initialDelayPassed || !cyclesVisible}>
        {cycleCount} cycles completed
      </footer>
        </div>
      </div>
    </main>
  )
}

export default App
