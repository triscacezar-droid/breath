import './App.css'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DifficultyScale } from './DifficultyScale'
import type { Phase, VisibilityMode, TimingMode, BreathMode, ColorScheme } from './types'
import {
  DEFAULT_DURATIONS,
  TIMING_MODE_LABELS,
  COLOR_SCHEMES,
  THEME_LABELS,
  BREATH_MODE_KEY,
  COLOR_SCHEME_KEY,
  DOUBLE_TAP_WINDOW_MS,
  getMaxMultiplier,
} from './constants'
import { getStoredColorScheme, getStoredBreathMode } from './utils'
import { SlotInput, SlotDisplay } from './components/SlotInput'
import { PhaseDots } from './components/PhaseDots'
import { SettingsDropdown } from './components/SettingsDropdown'
import { VisibilitySlider } from './components/VisibilitySlider'
import { useVisibilityLerp } from './hooks/useVisibilityLerp'
import { useBreathTimer } from './hooks/useBreathTimer'
import { useBreathAnimation } from './hooks/useBreathAnimation'
import { useDurationsSync } from './hooks/useDurationsSync'
import { usePresence } from './hooks/usePresence'

function App() {
  /* ---------- Model ---------- */
  const [timingMode, setTimingMode] = useState<TimingMode>('box')
  const [timingModeDropdownOpen, setTimingModeDropdownOpen] = useState(false)
  const [multiplierSeconds, setMultiplierSeconds] = useState(4)
  const [durations, setDurations] = useState<Record<Phase, number>>(() => ({ ...DEFAULT_DURATIONS }))
  const durationsRef = useRef<Record<Phase, number>>(durations)
  const [showInfo, setShowInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [textVisibility, setTextVisibility] = useState<VisibilityMode>(2)
  const [dotsVisibility, setDotsVisibility] = useState<VisibilityMode>(0)
  const [sphereVisibility, setSphereVisibility] = useState<VisibilityMode>(2)
  const [cyclesVisibility, setCyclesVisibility] = useState<VisibilityMode>(1)

  const {
    textVisibilityAnimated,
    dotsVisibilityAnimated,
    sphereVisibilityAnimated,
    cyclesVisibilityAnimated,
    setDotsVisibilityAnimated,
    getSliderHandlers,
  } = useVisibilityLerp(
    textVisibility,
    dotsVisibility,
    sphereVisibility,
    cyclesVisibility,
    setTextVisibility,
    setDotsVisibility,
    setSphereVisibility,
    setCyclesVisibility
  )
  const [editingDuration, setEditingDuration] = useState<Partial<Record<Phase, string>>>({})
  const [editingBoxBreath, setEditingBoxBreath] = useState<string | undefined>(undefined)
  const [initialDelayPassed, setInitialDelayPassed] = useState(false)
  const [contentRevealed, setContentRevealed] = useState(false)
  const othersOnline = usePresence()
  const [colorScheme, setColorScheme] = useState<ColorScheme>(getStoredColorScheme)
  const [colorSchemeDropdownOpen, setColorSchemeDropdownOpen] = useState(false)
  const [breathMode, setBreathMode] = useState<BreathMode>(getStoredBreathMode)
  const [breathModeDropdownOpen, setBreathModeDropdownOpen] = useState(false)

  const hideInfoTimeoutRef = useRef<number | null>(null)
  const breathModeRef = useRef<BreathMode>('normal')

  const timer = useBreathTimer(durationsRef)
  const { phase, secondsLeft, cycleCount, label, prevLabel, labelAnimating, resetToInhale, reset, phaseRef, cycleCountRef, phaseStartTimeRef } = timer
  const { scale, sphereAnulomLeft } = useBreathAnimation(
    phaseRef,
    durationsRef,
    phaseStartTimeRef,
    breathModeRef,
    cycleCountRef
  )
  const stackRef = useRef<HTMLDivElement>(null)
  const slot1Ref = useRef<HTMLDivElement>(null)
  const slot2Ref = useRef<HTMLDivElement>(null)
  const slot3Ref = useRef<HTMLDivElement>(null)
  const lastTapTimeRef = useRef<number>(0)
  const singleTapTimeoutRef = useRef<number | null>(null)
  const lastClosedByDoubleTapRef = useRef<number>(0)
  const settingsRef = useRef<HTMLElement>(null)

  const [slotTops, setSlotTops] = useState<[number, number, number]>([0, 0, 0])
  const [measuredSlotTop, setMeasuredSlotTop] = useState<'text' | null>(null)
  const [measuredSlotMiddle, setMeasuredSlotMiddle] = useState<'text' | 'dots' | null>(null)
  const [measuredSlotBottom, setMeasuredSlotBottom] = useState<'text' | 'dots' | 'sphere' | null>(null)
  const [enteringText, setEnteringText] = useState(false)
  const [enteringDots, setEnteringDots] = useState(false)
  const [enteringSphere, setEnteringSphere] = useState(false)
  const prevMeasuredRef = useRef({ top: null as 'text' | null, middle: null as 'text' | 'dots' | null, bottom: null as 'text' | 'dots' | 'sphere' | null })

  /* ---------- Derived from model (view uses these) ---------- */
  const totalBreathSeconds =
    durations.INHALE + durations.HOLD_TOP + durations.EXHALE + durations.HOLD_BOTTOM
  const breathsPerMinute = totalBreathSeconds > 0 ? 60 / totalBreathSeconds : 0
  const textVisible = textVisibility === 2 || (textVisibility === 1 && showInfo)
  const dotsVisible = dotsVisibility === 2 || (dotsVisibility === 1 && showInfo)
  const sphereVisible = sphereVisibility === 2 || (sphereVisibility === 1 && showInfo)
  const cyclesVisible = cyclesVisibility === 2 || (cyclesVisibility === 1 && showInfo)
  const contentVisible = initialDelayPassed && contentRevealed

  /* Stack slots: bottom = center (sphere's spot), then middle, then top. Priority: sphere > dots > text. */
  const slotBottom = sphereVisible ? 'sphere' : (dotsVisible ? 'dots' : (textVisible ? 'text' : null))
  const slotMiddle = sphereVisible
    ? (dotsVisible ? 'dots' : (textVisible ? 'text' : null))
    : (dotsVisible && textVisible ? 'text' : null)
  const slotTop = sphereVisible && dotsVisible && textVisible ? 'text' : null

  useLayoutEffect(() => {
    const stack = stackRef.current
    const s1 = slot1Ref.current
    const s2 = slot2Ref.current
    const s3 = slot3Ref.current
    if (!stack || !s1 || !s2 || !s3) return
    const stackRect = stack.getBoundingClientRect()
    const getTop = (el: HTMLElement) => el.getBoundingClientRect().top - stackRect.top
    setSlotTops([getTop(s1), getTop(s2), getTop(s3)])
    const prev = prevMeasuredRef.current
    setMeasuredSlotTop(slotTop)
    setMeasuredSlotMiddle(slotMiddle)
    setMeasuredSlotBottom(slotBottom)
    setEnteringText(
      (slotTop === 'text' || slotMiddle === 'text' || slotBottom === 'text') &&
      prev.top !== 'text' && prev.middle !== 'text' && prev.bottom !== 'text'
    )
    setEnteringDots(
      (slotMiddle === 'dots' || slotBottom === 'dots') &&
      prev.middle !== 'dots' && prev.bottom !== 'dots'
    )
    setEnteringSphere(
      slotBottom === 'sphere' && prev.bottom !== 'sphere'
    )
    prevMeasuredRef.current = { top: slotTop, middle: slotMiddle, bottom: slotBottom }
  }, [slotTop, slotMiddle, slotBottom, contentVisible])

  const textSlotIndex: 0 | 1 | 2 | -1 = measuredSlotTop === 'text' ? 0 : measuredSlotMiddle === 'text' ? 1 : measuredSlotBottom === 'text' ? 2 : -1
  const dotsSlotIndex: 0 | 1 | 2 | -1 = measuredSlotMiddle === 'dots' ? 1 : measuredSlotBottom === 'dots' ? 2 : -1
  const sphereSlotIndex: 2 | -1 = measuredSlotBottom === 'sphere' ? 2 : -1
  const textTop = textSlotIndex === 0 ? slotTops[0] : textSlotIndex === 1 ? slotTops[1] : textSlotIndex === 2 ? slotTops[2] : 0
  const dotsTop = dotsSlotIndex === 1 ? slotTops[1] : dotsSlotIndex === 2 ? slotTops[2] : 0
  const sphereTop = sphereSlotIndex === 2 ? slotTops[2] : 0

  const showFloatingText = textVisible && (measuredSlotTop === 'text' || measuredSlotMiddle === 'text' || measuredSlotBottom === 'text')
  const showFloatingDots = dotsVisible && (measuredSlotMiddle === 'dots' || measuredSlotBottom === 'dots')
  const showFloatingSphere = sphereVisible && measuredSlotBottom === 'sphere'

  const hasContentBeenRevealedRef = useRef(false)

  useEffect(() => {
    const el = settingsRef.current
    if (!el) return
    if (showSettings) {
      el.removeAttribute('inert')
    } else {
      el.setAttribute('inert', '')
    }
  }, [showSettings])

  /* ---------- Controller: 1s initial delay, then reveal everything (as if user tapped) ---------- */
  useEffect(() => {
    const t = window.setTimeout(() => {
      setInitialDelayPassed(true)
      setContentRevealed(true)
      setShowInfo(true)
      hasContentBeenRevealedRef.current = true
    }, 1000)
    return () => window.clearTimeout(t)
  }, [])

  /* ---------- Controller: on any setting change (after initial reveal), hide everything, reset breath state, reveal after 1s ---------- */
  useEffect(() => {
    if (!hasContentBeenRevealedRef.current) return
    setContentRevealed(false)
    setInitialDelayPassed(false)
    resetToInhale()
    const t = window.setTimeout(() => {
      reset()
      setInitialDelayPassed(true)
      setContentRevealed(true)
      setShowInfo(true)
    }, 1000)
    return () => window.clearTimeout(t)
  }, [
    timingMode,
    multiplierSeconds,
    breathMode,
    colorScheme,
    durations.INHALE,
    durations.HOLD_TOP,
    durations.EXHALE,
    durations.HOLD_BOTTOM,
    textVisibility,
    dotsVisibility,
    sphereVisibility,
    cyclesVisibility,
  ])

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

  useEffect(() => {
    durationsRef.current = durations
  }, [durations])

  // When durations are not all equal (box mode), set dots slider to Off
  useEffect(() => {
    if (timingMode !== 'box') return
    const allEqual =
      durations.INHALE === durations.HOLD_TOP &&
      durations.HOLD_TOP === durations.EXHALE &&
      durations.EXHALE === durations.HOLD_BOTTOM
    if (!allEqual && dotsVisibility !== 0) {
      setDotsVisibility(0)
      setDotsVisibilityAnimated(0)
    }
  }, [timingMode, durations, dotsVisibility])

  useDurationsSync(timingMode, multiplierSeconds, setDurations)

  // When switching to custom, turn dots off (durations may differ)
  useEffect(() => {
    if (timingMode === 'custom') {
      setDotsVisibility(0)
      setDotsVisibilityAnimated(0)
    }
  }, [timingMode])

  useEffect(() => {
    breathModeRef.current = breathMode
  }, [breathMode])

  const handleUserInteract = () => {
    if (showSettings) {
      lastClosedByDoubleTapRef.current = Date.now()
      setShowSettings(false)
      return
    }
    setShowInfo(true)
  }

  const handleDoubleTapOrDoubleClick = () => {
    if (showSettings) {
      lastClosedByDoubleTapRef.current = Date.now()
      setShowSettings(false)
      return
    }
    if (Date.now() - lastClosedByDoubleTapRef.current < 400) {
      return
    }
    setShowSettings(true)
  }

  const handleContentClick = () => {
    handleUserInteract()
  }

  const handleContentTouchStart = () => {
    const now = Date.now()
    if (singleTapTimeoutRef.current !== null) {
      window.clearTimeout(singleTapTimeoutRef.current)
      singleTapTimeoutRef.current = null
    }
    if (now - lastTapTimeRef.current < DOUBLE_TAP_WINDOW_MS) {
      lastTapTimeRef.current = 0
      handleDoubleTapOrDoubleClick()
      return
    }
    lastTapTimeRef.current = now
    singleTapTimeoutRef.current = window.setTimeout(() => {
      singleTapTimeoutRef.current = null
      handleUserInteract()
    }, DOUBLE_TAP_WINDOW_MS)
  }

  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current !== null) {
        window.clearTimeout(singleTapTimeoutRef.current)
      }
    }
  }, [])

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

  const multiplierDisplayValue = editingBoxBreath !== undefined ? editingBoxBreath : String(multiplierSeconds)
  const handleMultiplierChange = (value: string) => {
    setEditingBoxBreath(value.replace(/\D/g, '').slice(0, 2))
  }
  const handleMultiplierBlur = () => {
    const s = editingBoxBreath
    if (s === undefined) return
    const n = parseInt(s, 10)
    const maxM = getMaxMultiplier(timingMode)
    const v = Number.isNaN(n) ? 0 : Math.max(0, Math.min(maxM, n))
    setMultiplierSeconds(v)
    setEditingBoxBreath(undefined)
  }


  useEffect(() => {
    document.documentElement.dataset.theme = colorScheme
    localStorage.setItem(COLOR_SCHEME_KEY, colorScheme)
  }, [colorScheme])

  useEffect(() => {
    localStorage.setItem(BREATH_MODE_KEY, breathMode)
  }, [breathMode])


  const handleTimingModeChange = (mode: TimingMode) => {
    setTimingModeDropdownOpen(false)
    if (mode === 'custom') {
      setTimingMode('custom')
      return
    }
    if (timingMode === 'custom') {
      setMultiplierSeconds(durations.INHALE)
    }
    setTimingMode(mode)
  }

  /* ---------- View ---------- */
  return (
    <main className="app">
      <aside ref={settingsRef} className={`settings ${showSettings ? 'settings--open' : ''}`} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} aria-label="Breathing settings" aria-hidden={!showSettings}>
        <h2 className="settings-title">Breath Style</h2>
        <label className="settings-row">
          <span>Nostrils</span>
          <SettingsDropdown
            options={[
              { value: 'normal' as const, label: 'Normal' },
              { value: 'anulom_vilom' as const, label: 'Anulom Vilom' },
            ]}
            selected={breathMode}
            onSelect={setBreathMode}
            ariaLabel="Breath style"
            triggerLabel={breathMode === 'normal' ? 'Normal' : 'Anulom Vilom'}
            isOpen={breathModeDropdownOpen}
            onOpenChange={setBreathModeDropdownOpen}
          />
        </label>
        <label className="settings-row">
          <span>Ratio</span>
          <SettingsDropdown
            options={[
              { value: 'long_exhale' as const, label: '1:2' },
              { value: 'equal' as const, label: '1:1' },
              { value: 'kumbhaka' as const, label: '1:4:2' },
              { value: 'box' as const, label: '1:1:1:1' },
              { value: 'custom' as const, label: 'Custom' },
            ]}
            selected={timingMode}
            onSelect={(mode) => handleTimingModeChange(mode)}
            ariaLabel="Breathing ratio"
            triggerLabel={TIMING_MODE_LABELS[timingMode]}
            isOpen={timingModeDropdownOpen}
            onOpenChange={setTimingModeDropdownOpen}
          />
        </label>
        <label className={`settings-row ${timingMode === 'custom' ? 'settings-row--disabled' : ''}`}>
          <span>Multiplier</span>
          <div className={`settings-duration-wrap ${timingMode === 'custom' ? 'settings-duration-wrap--disabled' : ''}`}>
            <button type="button" className="settings-duration-btn" disabled={timingMode === 'custom'} onClick={() => timingMode !== 'custom' && setMultiplierSeconds((v) => Math.max(0, v - 1))} aria-label="Decrease multiplier">−</button>
            <SlotInput
              value={multiplierDisplayValue}
              onChange={(e) => timingMode !== 'custom' && handleMultiplierChange(e.target.value)}
              onBlur={handleMultiplierBlur}
              disabled={timingMode === 'custom'}
              aria-label="Multiplier"
            />
            <button type="button" className="settings-duration-btn" disabled={timingMode === 'custom'} onClick={() => timingMode !== 'custom' && setMultiplierSeconds((v) => Math.min(getMaxMultiplier(timingMode), v + 1))} aria-label="Increase multiplier">+</button>
          </div>
        </label>
        <div className="settings-duration-rows">
          <label className={`settings-row ${timingMode !== 'custom' ? 'settings-row--disabled' : ''}`}>
            <span>Inhale</span>
            <div className="settings-duration-wrap">
              <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('INHALE', Math.max(0, durations.INHALE - 1))} aria-label="Decrease inhale">−</button>
              <SlotInput
                value={durationDisplayValue('INHALE')}
                onChange={(e) => timingMode === 'custom' && handleDurationChange('INHALE', e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={() => timingMode === 'custom' && handleDurationBlur('INHALE')}
                disabled={timingMode !== 'custom'}
                aria-label="Inhale duration"
              />
              <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('INHALE', Math.min(60, durations.INHALE + 1))} aria-label="Increase inhale">+</button>
            </div>
          </label>
          <label className={`settings-row settings-row--duration ${timingMode !== 'custom' ? 'settings-row--disabled' : ''} ${(timingMode === 'custom' ? durations.HOLD_TOP === 0 : timingMode === 'equal' || timingMode === 'long_exhale') ? 'settings-row--collapsed' : ''} ${timingMode === 'custom' && durations.HOLD_TOP === 0 ? 'settings-row--zero' : ''}`}>
            <span>Hold (top)</span>
            <div className="settings-duration-wrap">
              <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('HOLD_TOP', Math.max(0, durations.HOLD_TOP - 1))} aria-label="Decrease hold top">−</button>
              <SlotInput
                value={durationDisplayValue('HOLD_TOP')}
                onChange={(e) => timingMode === 'custom' && handleDurationChange('HOLD_TOP', e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={() => timingMode === 'custom' && handleDurationBlur('HOLD_TOP')}
                disabled={timingMode !== 'custom'}
                aria-label="Hold top duration"
              />
              <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('HOLD_TOP', Math.min(60, durations.HOLD_TOP + 1))} aria-label="Increase hold top">+</button>
            </div>
          </label>
          <label className={`settings-row ${timingMode !== 'custom' ? 'settings-row--disabled' : ''}`}>
            <span>Exhale</span>
          <div className="settings-duration-wrap">
            <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('EXHALE', Math.max(0, durations.EXHALE - 1))} aria-label="Decrease exhale">−</button>
            <SlotInput
              value={durationDisplayValue('EXHALE')}
              onChange={(e) => timingMode === 'custom' && handleDurationChange('EXHALE', e.target.value.replace(/\D/g, '').slice(0, 2))}
              onBlur={() => timingMode === 'custom' && handleDurationBlur('EXHALE')}
              disabled={timingMode !== 'custom'}
              aria-label="Exhale duration"
            />
            <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('EXHALE', Math.min(60, durations.EXHALE + 1))} aria-label="Increase exhale">+</button>
          </div>
          </label>
          <label className={`settings-row settings-row--duration ${timingMode !== 'custom' ? 'settings-row--disabled' : ''} ${(timingMode === 'custom' ? durations.HOLD_BOTTOM === 0 : timingMode !== 'box') ? 'settings-row--collapsed' : ''} ${timingMode === 'custom' && durations.HOLD_BOTTOM === 0 ? 'settings-row--zero' : ''}`}>
            <span>Hold (bottom)</span>
            <div className="settings-duration-wrap">
              <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('HOLD_BOTTOM', Math.max(0, durations.HOLD_BOTTOM - 1))} aria-label="Decrease hold bottom">−</button>
              <SlotInput
                value={durationDisplayValue('HOLD_BOTTOM')}
                onChange={(e) => timingMode === 'custom' && handleDurationChange('HOLD_BOTTOM', e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={() => timingMode === 'custom' && handleDurationBlur('HOLD_BOTTOM')}
                disabled={timingMode !== 'custom'}
                aria-label="Hold bottom duration"
              />
              <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('HOLD_BOTTOM', Math.min(60, durations.HOLD_BOTTOM + 1))} aria-label="Increase hold bottom">+</button>
            </div>
          </label>
        </div>
        <div className="settings-row settings-row--bpm">
          <span>Breaths per minute</span>
          <div className="settings-bpm-difficulty-wrap">
            {totalBreathSeconds > 0 ? (
              <div className="settings-bpm-value-wrap">
                <SlotDisplay
                  value={breathsPerMinute.toFixed(1)}
                  aria-label="Breaths per minute"
                />
                <div className="settings-bpm-triangle" aria-hidden />
              </div>
            ) : (
              <div className="settings-bpm-value-wrap">
                <SlotDisplay value="—" aria-label="Breaths per minute" />
                <div className="settings-bpm-triangle settings-bpm-triangle--hidden" aria-hidden />
              </div>
            )}
          </div>
        </div>
        <div className="settings-row settings-row--difficulty">
          <span>Pace</span>
          <div className="settings-duration-wrap">
            {totalBreathSeconds > 0 ? (
              <DifficultyScale bpm={breathsPerMinute} />
            ) : (
              <div className="difficulty-scale difficulty-scale--empty" aria-label="Pace">
                <span className="difficulty-scale__empty">—</span>
              </div>
            )}
          </div>
        </div>
        {/* ---------- View: visibility sliders (read/write model) ---------- */}
        <h2 className="settings-title">Visibility</h2>
        <div className="settings-row settings-row--slider">
          <span className="settings-slider-label">Text</span>
          <VisibilitySlider
            value={textVisibility}
            valueAnimated={textVisibilityAnimated}
            onChange={getSliderHandlers('text').onChange}
            onPointerDown={getSliderHandlers('text').onPointerDown}
            onPointerUp={getSliderHandlers('text').onPointerUp}
            onPointerLeave={getSliderHandlers('text').onPointerLeave}
            ariaLabel="Phase text visibility"
          />
        </div>
        <div className={`settings-row settings-row--slider ${timingMode !== 'box' && timingMode !== 'equal' && timingMode !== 'long_exhale' && timingMode !== 'kumbhaka' ? 'settings-row--disabled' : ''}`}>
          <span className="settings-slider-label">Dots</span>
          <VisibilitySlider
            value={dotsVisibility}
            valueAnimated={dotsVisibilityAnimated}
            onChange={getSliderHandlers('dots').onChange}
            onPointerDown={getSliderHandlers('dots').onPointerDown}
            onPointerUp={getSliderHandlers('dots').onPointerUp}
            onPointerLeave={getSliderHandlers('dots').onPointerLeave}
            disabled={timingMode !== 'box' && timingMode !== 'equal' && timingMode !== 'long_exhale' && timingMode !== 'kumbhaka'}
            ariaLabel="Dots visibility"
          />
        </div>
        <div className="settings-row settings-row--slider">
          <span className="settings-slider-label">Sphere</span>
          <VisibilitySlider
            value={sphereVisibility}
            valueAnimated={sphereVisibilityAnimated}
            onChange={getSliderHandlers('sphere').onChange}
            onPointerDown={getSliderHandlers('sphere').onPointerDown}
            onPointerUp={getSliderHandlers('sphere').onPointerUp}
            onPointerLeave={getSliderHandlers('sphere').onPointerLeave}
            ariaLabel="Sphere visibility"
          />
        </div>
        <div className="settings-row settings-row--slider">
          <span className="settings-slider-label">Cycles</span>
          <VisibilitySlider
            value={cyclesVisibility}
            valueAnimated={cyclesVisibilityAnimated}
            onChange={getSliderHandlers('cycles').onChange}
            onPointerDown={getSliderHandlers('cycles').onPointerDown}
            onPointerUp={getSliderHandlers('cycles').onPointerUp}
            onPointerLeave={getSliderHandlers('cycles').onPointerLeave}
            ariaLabel="Cycles completed visibility"
            showLabels
          />
        </div>
        <h2 className="settings-title">Color scheme</h2>
        <label className="settings-row">
          <span>Theme</span>
          <SettingsDropdown
            options={COLOR_SCHEMES.map((scheme) => ({ value: scheme, label: THEME_LABELS[scheme] }))}
            selected={colorScheme}
            onSelect={setColorScheme}
            ariaLabel="Color scheme"
            triggerLabel={THEME_LABELS[colorScheme]}
            isOpen={colorSchemeDropdownOpen}
            onOpenChange={setColorSchemeDropdownOpen}
            dropup
            panelClassName="settings-dropdown__panel--themes"
          />
        </label>
      </aside>
      <div className="content-wrap" onClick={handleContentClick} onDoubleClick={handleDoubleTapOrDoubleClick} onTouchStart={handleContentTouchStart}>
        <div className={`content-inner ${contentVisible ? 'content-inner--visible' : ''}`}>
        <button type="button" className={`settings-trigger ${showInfo && contentVisible ? 'settings-trigger--visible' : ''}`} onClick={(e) => { e.stopPropagation(); setShowSettings(true) }} onTouchStart={(e) => e.stopPropagation()} aria-label="Open settings" aria-hidden={!showInfo || !contentVisible}>
            <span className="settings-trigger-icon" aria-hidden />
          </button>
      <section className="session" aria-label="Breathing session">
        <div
          ref={stackRef}
          className="breath-stack"
          aria-hidden={!contentVisible || (!textVisible && !dotsVisible && !sphereVisible)}
        >
          <div ref={slot1Ref} className="breath-stack__slot">
            {slotTop != null && <div className="breath-stack__spacer breath-stack__spacer--top" aria-hidden />}
          </div>
          <div ref={slot2Ref} className="breath-stack__slot">
            {slotMiddle != null && <div className="breath-stack__spacer breath-stack__spacer--middle" aria-hidden />}
          </div>
          <div ref={slot3Ref} className="breath-stack__slot breath-stack__slot--center">
            {slotBottom != null && (
              <div
                className={`breath-stack__spacer ${slotBottom === 'sphere' ? 'breath-stack__spacer--center' : 'breath-stack__spacer--middle'}`}
                aria-hidden
              />
            )}
          </div>
          <div className="breath-stack__floating">
            {showFloatingText && (
              <div
                className={`breath-stack__float-item ${enteringText ? 'breath-stack__float-item--entering' : ''}`}
                style={{
                  top: textTop,
                  transition: 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onAnimationEnd={() => enteringText && setEnteringText(false)}
              >
                <div className={`status ${contentVisible && textVisible ? 'status--visible' : 'status--hidden'}`}>
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
              </div>
            )}
            {showFloatingDots && (
              <div
                className={`breath-stack__float-item ${enteringDots ? 'breath-stack__float-item--entering' : ''}`}
                style={{
                  top: dotsTop,
                  transition: 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onAnimationEnd={() => enteringDots && setEnteringDots(false)}
              >
                <div className={`phase-dots-wrap ${contentVisible && dotsVisible ? 'phase-dots-wrap--visible' : 'phase-dots-wrap--hidden'}`}>
                  <PhaseDots phase={phase} duration={durations[phase]} secondsLeft={secondsLeft} timingMode={timingMode} durations={durations} breathMode={breathMode} cycleCount={cycleCount} />
                </div>
              </div>
            )}
            {showFloatingSphere && breathMode === 'normal' && (
              <div
                className={`breath-stack__float-item breath-stack__float-item--sphere ${enteringSphere ? 'breath-stack__float-item--entering' : ''}`}
                style={{
                  top: sphereTop,
                  left: '50%',
                  transition: 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onAnimationEnd={() => enteringSphere && setEnteringSphere(false)}
              >
                <div
                  className={`circle circle--in-center-slot ${contentVisible && sphereVisible ? 'circle--visible' : 'circle--hidden'}`}
                  data-phase={phase}
                  style={{ transform: `translate(-50%, 50%) scale(${scale})` }}
                />
              </div>
            )}
            {showFloatingSphere && breathMode === 'anulom_vilom' && (
              <div
                className={`breath-stack__float-item breath-stack__float-item--sphere breath-stack__float-item--sphere-anulom ${enteringSphere ? 'breath-stack__float-item--entering' : ''}`}
                style={{
                  top: sphereTop,
                  left: `${sphereAnulomLeft}%`,
                  transition: 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onAnimationEnd={() => enteringSphere && setEnteringSphere(false)}
              >
                <div
                  className={`circle circle--in-center-slot ${contentVisible && sphereVisible ? 'circle--visible' : 'circle--hidden'}`}
                  data-phase={phase}
                  style={{ transform: `translate(-50%, 50%) scale(${scale})` }}
                />
              </div>
            )}
          </div>
        </div>
      </section>
      <footer className={`cycles-footer ${contentVisible && cyclesVisible ? 'cycles-footer--visible' : 'cycles-footer--hidden'}`} aria-hidden={!contentVisible || !cyclesVisible}>
        <span>{cycleCount} cycles completed</span>
        {othersOnline !== null && (
          <span className="cycles-footer__presence">
            {othersOnline === 0 ? 'No one else right now' : `${othersOnline} ${othersOnline === 1 ? 'other' : 'others'} breathing now`}
          </span>
        )}
      </footer>
        </div>
      </div>
    </main>
  )
}

export default App
