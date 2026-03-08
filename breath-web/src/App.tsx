import './App.css'
import { createClient } from '@supabase/supabase-js'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { DifficultyScale } from './DifficultyScale'

const HAS_TOUCH = typeof window !== 'undefined' && 'ontouchstart' in window
/** Double-tap window: longer on touch devices (finger latency) */
const DOUBLE_TAP_WINDOW_MS = HAS_TOUCH ? 500 : 350

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

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

/** Box = equal phases; Equal = 1:1 (inhale:exhale, no holds); Kumbhaka = 1:4:2:0; Long Exhale = 1:0:2:0; Custom = user values */
type TimingMode = 'box' | 'equal' | 'kumbhaka' | 'long_exhale' | 'custom'

const TIMING_MODE_LABELS: Record<TimingMode, string> = {
  box: '1:1:1:1',
  equal: '1:1',
  kumbhaka: '1:4:2',
  long_exhale: '1:2',
  custom: 'Custom',
}

type BreathMode = 'normal' | 'anulom_vilom'

const BREATH_MODE_KEY = 'breath-mode'

function getStoredBreathMode(): BreathMode {
  const s = localStorage.getItem(BREATH_MODE_KEY)
  if (s === 'normal' || s === 'anulom_vilom') return s
  return 'normal'
}

const COLOR_SCHEMES = [
  'dark', 'light', 'sepia', 'dracula', 'monokai', 'solarized-dark', 'solarized-light',
  'one-dark', 'one-light', 'nord', 'gruvbox-dark', 'gruvbox-light', 'tokyo-night',
  'catppuccin-mocha', 'night-owl', 'github-dark', 'github-light', 'rose-pine',
  'forest', 'cyberpunk',
] as const

type ColorScheme = (typeof COLOR_SCHEMES)[number]

const THEME_LABELS: Record<ColorScheme, string> = {
  dark: 'Dark',
  light: 'Light',
  sepia: 'Sepia',
  dracula: 'Dracula',
  monokai: 'Monokai',
  'solarized-dark': 'Solarized Dark',
  'solarized-light': 'Solarized Light',
  'one-dark': 'One Dark',
  'one-light': 'One Light',
  nord: 'Nord',
  'gruvbox-dark': 'Gruvbox Dark',
  'gruvbox-light': 'Gruvbox Light',
  'tokyo-night': 'Tokyo Night',
  'catppuccin-mocha': 'Catppuccin Mocha',
  'night-owl': 'Night Owl',
  'github-dark': 'GitHub Dark',
  'github-light': 'GitHub Light',
  'rose-pine': 'Rose Pine',
  forest: 'Forest',
  cyberpunk: 'Cyberpunk',
}

const COLOR_SCHEME_KEY = 'breath-color-scheme'

function getStoredColorScheme(): ColorScheme {
  const s = localStorage.getItem(COLOR_SCHEME_KEY)
  if (s && COLOR_SCHEMES.includes(s as ColorScheme)) return s as ColorScheme
  return 'dark'
}

const KUMBHAKA_RATIO: Record<Phase, number> = {
  INHALE: 1,
  HOLD_TOP: 4,
  EXHALE: 2,
  HOLD_BOTTOM: 0,
}

const EQUAL_RATIO: Record<Phase, number> = {
  INHALE: 1,
  HOLD_TOP: 0,
  EXHALE: 1,
  HOLD_BOTTOM: 0,
}

const LONG_EXHALE_RATIO: Record<Phase, number> = {
  INHALE: 1,
  HOLD_TOP: 0,
  EXHALE: 2,
  HOLD_BOTTOM: 0,
}

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

function SlotInput({
  value,
  onChange,
  onBlur,
  disabled,
  inputMode = 'numeric',
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur: () => void
  disabled: boolean
  inputMode?: 'numeric' | 'text'
  'aria-label'?: string
}) {
  const [prevValue, setPrevValue] = useState(value)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'up' | 'down'>('up')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value !== prevValue && !focused) {
      const prevNum = parseInt(prevValue, 10)
      const nextNum = parseInt(value, 10)
      if (!Number.isNaN(prevNum) && !Number.isNaN(nextNum)) {
        setDirection(nextNum > prevNum ? 'up' : 'down')
        setAnimating(true)
        const t = window.setTimeout(() => {
          setPrevValue(value)
          setAnimating(false)
        }, 260)
        return () => window.clearTimeout(t)
      }
    }
    setPrevValue(value)
  }, [value, focused])

  return (
    <div className={`slot-input ${focused ? 'slot-input--focused' : ''}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={onChange}
        onBlur={() => { setFocused(false); onBlur() }}
        onFocus={() => setFocused(true)}
        disabled={disabled}
        className="slot-input__field"
        aria-label={ariaLabel}
      />
      <div
        className={`slot-input__display ${focused ? 'slot-input__display--hidden' : ''}`}
        onClick={() => !disabled && inputRef.current?.focus()}
        aria-hidden={focused}
      >
        {animating ? (
          <>
            <div className={`slot-input__in slot-input__in--${direction}`}>{value}</div>
            <div className={`slot-input__out slot-input__out--${direction}`}>{prevValue}</div>
          </>
        ) : (
          <div className="slot-input__value">{value}</div>
        )}
      </div>
    </div>
  )
}

function SlotDisplay({ value, rank, 'aria-label': ariaLabel, className }: { value: string; rank?: number; 'aria-label'?: string; className?: string }) {
  const [prevValue, setPrevValue] = useState(value)
  const [prevRank, setPrevRank] = useState(rank)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'up' | 'down'>('up')

  useEffect(() => {
    if (value !== prevValue) {
      const prevNum = parseFloat(prevValue)
      const nextNum = parseFloat(value)
      const useRank = rank !== undefined && prevRank !== undefined
      const useNumeric = !Number.isNaN(prevNum) && !Number.isNaN(nextNum)
      if (useRank || useNumeric) {
        setDirection(useRank ? (rank! > prevRank! ? 'up' : 'down') : (nextNum > prevNum ? 'up' : 'down'))
        setPrevRank(rank)
        setAnimating(true)
        const t = window.setTimeout(() => {
          setPrevValue(value)
          setPrevRank(rank)
          setAnimating(false)
        }, 260)
        return () => window.clearTimeout(t)
      }
      setPrevValue(value)
      setPrevRank(rank)
    }
  }, [value, rank])

  return (
    <div className={`slot-input slot-input--readonly ${className ?? ''}`}>
      <div className="slot-input__display" aria-label={ariaLabel} aria-live="polite">
        {animating ? (
          <>
            <div className={`slot-input__in slot-input__in--${direction}`}>{value}</div>
            <div className={`slot-input__out slot-input__out--${direction}`}>{prevValue}</div>
          </>
        ) : (
          <div className="slot-input__value">{value}</div>
        )}
      </div>
    </div>
  )
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
  const [timingMode, setTimingMode] = useState<TimingMode>('box')
  const [timingModeDropdownOpen, setTimingModeDropdownOpen] = useState(false)
  const [multiplierSeconds, setMultiplierSeconds] = useState(4)
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
  const [contentRevealed, setContentRevealed] = useState(false)
  const [othersOnline, setOthersOnline] = useState<number | null>(null)
  const [colorScheme, setColorScheme] = useState<ColorScheme>(getStoredColorScheme)
  const [colorSchemeDropdownOpen, setColorSchemeDropdownOpen] = useState(false)
  const [breathMode, setBreathMode] = useState<BreathMode>(getStoredBreathMode)
  const [breathModeDropdownOpen, setBreathModeDropdownOpen] = useState(false)

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
  const cycleCountRef = useRef(0)
  const breathModeRef = useRef<BreathMode>('normal')
  const stackRef = useRef<HTMLDivElement>(null)
  const slot1Ref = useRef<HTMLDivElement>(null)
  const slot2Ref = useRef<HTMLDivElement>(null)
  const slot3Ref = useRef<HTMLDivElement>(null)
  const timingModeDropdownRef = useRef<HTMLDivElement>(null)
  const colorSchemeDropdownRef = useRef<HTMLDivElement>(null)
  const breathModeDropdownRef = useRef<HTMLDivElement>(null)
  const lastTapTimeRef = useRef<number>(0)
  const singleTapTimeoutRef = useRef<number | null>(null)
  const lastClosedByDoubleTapRef = useRef<number>(0)

  const [scale, setScale] = useState<number>(MIN_SCALE)
  const [sphereAnulomLeft, setSphereAnulomLeft] = useState<number>(50)
  const [slotTops, setSlotTops] = useState<[number, number, number]>([0, 0, 0])
  const [measuredSlotTop, setMeasuredSlotTop] = useState<'text' | null>(null)
  const [measuredSlotMiddle, setMeasuredSlotMiddle] = useState<'text' | 'dots' | null>(null)
  const [measuredSlotBottom, setMeasuredSlotBottom] = useState<'text' | 'dots' | 'sphere' | null>(null)
  const [enteringText, setEnteringText] = useState(false)
  const [enteringDots, setEnteringDots] = useState(false)
  const [enteringSphere, setEnteringSphere] = useState(false)
  const prevMeasuredRef = useRef({ top: null as 'text' | null, middle: null as 'text' | 'dots' | null, bottom: null as 'text' | 'dots' | 'sphere' | null })

  /* ---------- Derived from model (view uses these) ---------- */
  const label = phaseLabel(phase)
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

  /* ---------- Controller: 1s initial delay, then reveal everything (as if user tapped) ---------- */
  useEffect(() => {
    const t = window.setTimeout(() => {
      setInitialDelayPassed(true)
      setContentRevealed(true)
      setShowInfo(true)
    }, 1000)
    return () => window.clearTimeout(t)
  }, [])

  /* ---------- Presence: how many others are using the app (Supabase Realtime) ---------- */
  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const PRESENCE_KEY = 'breath-presence'
    let sessionId = sessionStorage.getItem(PRESENCE_KEY)
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem(PRESENCE_KEY, sessionId)
    }
    const channel = supabase.channel('breath-users', {
      config: { presence: { key: sessionId } },
    })
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const total = Object.keys(state).length
        setOthersOnline(Math.max(0, total - 1))
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.track({ breathing: true })
        }
      })
    return () => {
      channel.unsubscribe()
    }
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

  // Keep durations in sync when in box, equal, kumbhaka, or long_exhale mode
  useEffect(() => {
    if (timingMode === 'custom') return
    const maxM = timingMode === 'kumbhaka' ? 15 : (timingMode === 'long_exhale' || timingMode === 'equal') ? 30 : 60
    const m = Math.max(0, Math.min(maxM, multiplierSeconds))
    if (timingMode === 'box') {
      setDurations(() => ({ INHALE: m, HOLD_TOP: m, EXHALE: m, HOLD_BOTTOM: m }))
    } else if (timingMode === 'equal') {
      setDurations(() => ({
        INHALE: Math.min(60, Math.round(EQUAL_RATIO.INHALE * m)),
        HOLD_TOP: Math.min(60, Math.round(EQUAL_RATIO.HOLD_TOP * m)),
        EXHALE: Math.min(60, Math.round(EQUAL_RATIO.EXHALE * m)),
        HOLD_BOTTOM: Math.min(60, Math.round(EQUAL_RATIO.HOLD_BOTTOM * m)),
      }))
    } else if (timingMode === 'long_exhale') {
      setDurations(() => ({
        INHALE: Math.min(60, Math.round(LONG_EXHALE_RATIO.INHALE * m)),
        HOLD_TOP: Math.min(60, Math.round(LONG_EXHALE_RATIO.HOLD_TOP * m)),
        EXHALE: Math.min(60, Math.round(LONG_EXHALE_RATIO.EXHALE * m)),
        HOLD_BOTTOM: Math.min(60, Math.round(LONG_EXHALE_RATIO.HOLD_BOTTOM * m)),
      }))
    } else {
      setDurations(() => ({
        INHALE: Math.min(60, Math.round(KUMBHAKA_RATIO.INHALE * m)),
        HOLD_TOP: Math.min(60, Math.round(KUMBHAKA_RATIO.HOLD_TOP * m)),
        EXHALE: Math.min(60, Math.round(KUMBHAKA_RATIO.EXHALE * m)),
        HOLD_BOTTOM: Math.min(60, Math.round(KUMBHAKA_RATIO.HOLD_BOTTOM * m)),
      }))
    }
  }, [timingMode, multiplierSeconds])

  // When switching to custom, equal, or long_exhale, turn dots off (durations may differ)
  useEffect(() => {
    if (timingMode === 'custom' || timingMode === 'equal' || timingMode === 'long_exhale') {
      setDotsVisibility(0)
      setDotsVisibilityAnimated(0)
    }
  }, [timingMode])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    cycleCountRef.current = cycleCount
  }, [cycleCount])

  useEffect(() => {
    breathModeRef.current = breathMode
  }, [breathMode])

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

      /* Anulom Vilom: sphere position tracks breath phase duration (in/out over full inhale/exhale), eased */
      if (breathModeRef.current === 'anulom_vilom') {
        const cc = cycleCountRef.current
        const exhaleTo = cc % 2 === 0 ? 65 : 35
        const inhaleFrom = cc === 0 ? 65 : (cc - 1) % 2 === 0 ? 65 : 35
        let desiredLeft: number
        if (currentPhase === 'INHALE') {
          const clampedElapsed = Math.max(0, Math.min(phaseDuration, elapsed))
          const progress = phaseDuration === 0 ? 0 : clampedElapsed / phaseDuration
          desiredLeft = inhaleFrom + (50 - inhaleFrom) * easeInOut(progress)
        } else if (currentPhase === 'HOLD_TOP') {
          desiredLeft = 50
        } else if (currentPhase === 'EXHALE') {
          const clampedElapsed = Math.max(0, Math.min(phaseDuration, elapsed))
          const progress = phaseDuration === 0 ? 0 : clampedElapsed / phaseDuration
          desiredLeft = 50 + (exhaleTo - 50) * easeInOut(progress)
        } else {
          desiredLeft = exhaleTo
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

      let next = nextPhase(currentPhase)
      let lastDisplayedPhase = currentPhase

      /* Skip zero-duration phases completely */
      for (let i = 0; i < 4 && durationsRef.current[next] === 0; i++) {
        if (lastDisplayedPhase === 'HOLD_BOTTOM' && next === 'INHALE') {
          setCycleCount((c) => c + 1)
        }
        lastDisplayedPhase = next
        next = nextPhase(next)
      }

      if (lastDisplayedPhase === 'HOLD_BOTTOM' && next === 'INHALE') {
        setCycleCount((c) => c + 1)
      }

      /* prevLabel = phase we actually displayed (left), not skipped phases */
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
    const maxM = timingMode === 'kumbhaka' ? 15 : (timingMode === 'long_exhale' || timingMode === 'equal') ? 30 : 60
    const v = Number.isNaN(n) ? 0 : Math.max(0, Math.min(maxM, n))
    setMultiplierSeconds(v)
    setEditingBoxBreath(undefined)
  }

  useEffect(() => {
    if (!timingModeDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (timingModeDropdownRef.current && !timingModeDropdownRef.current.contains(e.target as Node)) {
        setTimingModeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [timingModeDropdownOpen])

  useEffect(() => {
    if (!colorSchemeDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (colorSchemeDropdownRef.current && !colorSchemeDropdownRef.current.contains(e.target as Node)) {
        setColorSchemeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [colorSchemeDropdownOpen])

  useEffect(() => {
    document.documentElement.dataset.theme = colorScheme
    localStorage.setItem(COLOR_SCHEME_KEY, colorScheme)
  }, [colorScheme])

  useEffect(() => {
    localStorage.setItem(BREATH_MODE_KEY, breathMode)
  }, [breathMode])

  useEffect(() => {
    if (!breathModeDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (breathModeDropdownRef.current && !breathModeDropdownRef.current.contains(e.target as Node)) {
        setBreathModeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [breathModeDropdownOpen])

  const handleColorSchemeChange = (scheme: ColorScheme) => {
    setColorSchemeDropdownOpen(false)
    setColorScheme(scheme)
  }

  const handleBreathModeChange = (mode: BreathMode) => {
    setBreathModeDropdownOpen(false)
    setBreathMode(mode)
  }

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
      <aside className={`settings ${showSettings ? 'settings--open' : ''}`} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} aria-label="Breathing settings" aria-hidden={!showSettings}>
        <h2 className="settings-title">Breath Style</h2>
        <label className="settings-row">
          <span>Nostrils</span>
          <div ref={breathModeDropdownRef} className="settings-dropdown">
            <button
              type="button"
              className="settings-dropdown__trigger"
              onClick={() => setBreathModeDropdownOpen((o) => !o)}
              aria-expanded={breathModeDropdownOpen}
              aria-haspopup="listbox"
              aria-label="Breath style"
            >
              {breathMode === 'normal' ? 'Normal' : 'Anulom Vilom'}
              <span className="settings-dropdown__chevron" aria-hidden>{breathModeDropdownOpen ? '▲' : '▼'}</span>
            </button>
            <div className={`settings-dropdown__panel ${breathModeDropdownOpen ? 'settings-dropdown__panel--open' : ''}`} role="listbox">
              <button type="button" role="option" aria-selected={breathMode === 'normal'} className="settings-dropdown__option" onClick={() => handleBreathModeChange('normal')}>Normal</button>
              <button type="button" role="option" aria-selected={breathMode === 'anulom_vilom'} className="settings-dropdown__option" onClick={() => handleBreathModeChange('anulom_vilom')}>Anulom Vilom</button>
            </div>
          </div>
        </label>
        <label className="settings-row">
          <span>Ratio</span>
          <div ref={timingModeDropdownRef} className="settings-dropdown">
            <button
              type="button"
              className="settings-dropdown__trigger"
              onClick={() => setTimingModeDropdownOpen((o) => !o)}
              aria-expanded={timingModeDropdownOpen}
              aria-haspopup="listbox"
              aria-label="Breathing ratio"
            >
              {TIMING_MODE_LABELS[timingMode]}
              <span className="settings-dropdown__chevron" aria-hidden>{timingModeDropdownOpen ? '▲' : '▼'}</span>
            </button>
            <div className={`settings-dropdown__panel ${timingModeDropdownOpen ? 'settings-dropdown__panel--open' : ''}`} role="listbox">
              <button type="button" role="option" aria-selected={timingMode === 'long_exhale'} className="settings-dropdown__option" onClick={() => handleTimingModeChange('long_exhale')}>1:2</button>
              <button type="button" role="option" aria-selected={timingMode === 'equal'} className="settings-dropdown__option" onClick={() => handleTimingModeChange('equal')}>1:1</button>
              <button type="button" role="option" aria-selected={timingMode === 'kumbhaka'} className="settings-dropdown__option" onClick={() => handleTimingModeChange('kumbhaka')}>1:4:2</button>
              <button type="button" role="option" aria-selected={timingMode === 'box'} className="settings-dropdown__option" onClick={() => handleTimingModeChange('box')}>1:1:1:1</button>
              <button type="button" role="option" aria-selected={timingMode === 'custom'} className="settings-dropdown__option" onClick={() => handleTimingModeChange('custom')}>Custom</button>
            </div>
          </div>
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
            <button type="button" className="settings-duration-btn" disabled={timingMode === 'custom'} onClick={() => timingMode !== 'custom' && setMultiplierSeconds((v) => Math.min(timingMode === 'kumbhaka' ? 15 : (timingMode === 'long_exhale' || timingMode === 'equal') ? 30 : 60, v + 1))} aria-label="Increase multiplier">+</button>
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
          <label className={`settings-row settings-row--duration ${timingMode !== 'custom' ? 'settings-row--disabled' : ''} ${durations.HOLD_TOP === 0 && timingMode !== 'custom' ? 'settings-row--collapsed' : ''} ${timingMode === 'custom' && durations.HOLD_TOP === 0 ? 'settings-row--zero' : ''}`}>
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
          <label className={`settings-row settings-row--duration ${timingMode !== 'custom' ? 'settings-row--disabled' : ''} ${durations.HOLD_BOTTOM === 0 && timingMode !== 'custom' ? 'settings-row--collapsed' : ''} ${timingMode === 'custom' && durations.HOLD_BOTTOM === 0 ? 'settings-row--zero' : ''}`}>
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
          <span>Exp. Difficulty</span>
          <div className="settings-duration-wrap">
            {totalBreathSeconds > 0 ? (
              <DifficultyScale bpm={breathsPerMinute} />
            ) : (
              <div className="difficulty-scale difficulty-scale--empty" aria-label="Exp. Difficulty">
                <span className="difficulty-scale__empty">—</span>
              </div>
            )}
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
          </div>
        </div>
        <div className={`settings-row settings-row--slider ${timingMode !== 'box' ? 'settings-row--disabled' : ''}`}>
          <span className="settings-slider-label">Dots</span>
          <div className={`settings-slider-wrap ${Math.round(dotsVisibilityAnimated) === 0 ? 'settings-slider-wrap--off' : ''}`}>
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={dotsVisibilityAnimated}
              disabled={timingMode !== 'box'}
              onPointerDown={() => { timingMode === 'box' && (draggingSliderRef.current = 'dots'); sliderChangeCountRef.current = 0 }}
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
        <h2 className="settings-title">Color scheme</h2>
        <label className="settings-row">
          <span>Theme</span>
          <div ref={colorSchemeDropdownRef} className="settings-dropdown settings-dropdown--dropup">
            <button
              type="button"
              className="settings-dropdown__trigger"
              onClick={() => setColorSchemeDropdownOpen((o) => !o)}
              aria-expanded={colorSchemeDropdownOpen}
              aria-haspopup="listbox"
              aria-label="Color scheme"
            >
              {THEME_LABELS[colorScheme]}
              <span className="settings-dropdown__chevron" aria-hidden>{colorSchemeDropdownOpen ? '▲' : '▼'}</span>
            </button>
            <div className={`settings-dropdown__panel settings-dropdown__panel--themes ${colorSchemeDropdownOpen ? 'settings-dropdown__panel--open' : ''}`} role="listbox">
              {COLOR_SCHEMES.map((scheme) => (
                <button key={scheme} type="button" role="option" aria-selected={colorScheme === scheme} className="settings-dropdown__option" onClick={() => handleColorSchemeChange(scheme)}>{THEME_LABELS[scheme]}</button>
              ))}
            </div>
          </div>
        </label>
      </aside>
      <div className="content-wrap" onClick={handleContentClick} onDoubleClick={handleDoubleTapOrDoubleClick} onTouchStart={handleContentTouchStart}>
        <div className={`content-inner ${contentVisible ? 'content-inner--visible' : ''}`}>
        <button type="button" className={`settings-trigger ${showInfo && contentVisible ? 'settings-trigger--visible' : ''}`} onClick={(e) => { e.stopPropagation(); setShowSettings(true) }} onTouchStart={(e) => e.stopPropagation()} aria-label="Open settings" aria-hidden={!showInfo || !contentVisible}>
            <span className="settings-trigger-icon" aria-hidden>
              <span />
              <span />
              <span />
            </span>
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
                  <PhaseDots phase={phase} duration={durations[phase]} secondsLeft={secondsLeft} />
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
