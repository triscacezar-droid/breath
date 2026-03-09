import './App.css'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DifficultyScale } from './DifficultyScale'
import type { Phase, VisibilityMode, TimingMode, BreathMode, ColorScheme, FooterDisplayMode, LabelVariant, ProgressVariant, CenterVariant } from './types'
import {
  DEFAULT_DURATIONS,
  COLOR_SCHEMES,
  BREATH_MODE_KEY,
  COLOR_SCHEME_KEY,
  VISUALIZATION_KEY,
  FOOTER_DISPLAY_KEY,
  PRESETS,
  LABEL_VARIANTS,
  PROGRESS_VARIANTS,
  CENTER_VARIANTS,
  getMaxMultiplier,
  schemeToThemeKey,
} from './constants'
import { getStoredColorScheme, getStoredBreathMode, getStoredVisualization, getStoredFooterDisplayMode, formatElapsedSeconds, getPhaseLabelDisplay } from './utils'
import {
  buildBreathStack,
  getSpacerClass,
  getViewportTopVh,
  isInStack,
  isEntering,
  type BreathStack,
} from './breathStack'
import { SlotInput, SlotDisplay } from './components/SlotInput'
import { PhaseDots } from './components/PhaseDots'
import { SettingsDropdown } from './components/SettingsDropdown'
import { VisibilitySlider } from './components/VisibilitySlider'
import { useVisibilityLerp } from './hooks/useVisibilityLerp'
import { useVisibilityWithDelays } from './hooks/useVisibilityWithDelays'
import { useBreathTimer } from './hooks/useBreathTimer'
import { useBreathAnimation } from './hooks/useBreathAnimation'
import { useDurationsSync } from './hooks/useDurationsSync'
import { usePresence } from './hooks/usePresence'
import { useFullscreen } from './hooks/useFullscreen'
import { useTranslation } from 'react-i18next'

function App() {
  const { t, i18n } = useTranslation()
  const SUPPORTED_LANGS = ['en', 'de', 'ro', 'es', 'fr', 'pt', 'it', 'pl', 'ru', 'ja', 'zh', 'hi'] as const
  type SupportedLang = (typeof SUPPORTED_LANGS)[number]
  const resolvedLang: SupportedLang =
    (i18n.resolvedLanguage && SUPPORTED_LANGS.includes(i18n.resolvedLanguage as SupportedLang))
      ? (i18n.resolvedLanguage as SupportedLang)
      : SUPPORTED_LANGS.find((l) => i18n.resolvedLanguage?.startsWith(l)) ?? 'en'

  const [showAbout, setShowAbout] = useState(false)
  useEffect(() => {
    document.title = t('app.title')
  }, [t])
  useEffect(() => {
    if (!showAbout) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAbout(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [showAbout])
  useEffect(() => {
    document.documentElement.lang = i18n.language
  }, [i18n.language])
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
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false)
  const [breathMode, setBreathMode] = useState<BreathMode>(getStoredBreathMode)
  const [breathModeDropdownOpen, setBreathModeDropdownOpen] = useState(false)

  const [labelVariant, setLabelVariant] = useState<LabelVariant>(
    () => getStoredVisualization().labelVariant
  )
  const [progressVariant, setProgressVariant] = useState<ProgressVariant>(
    () => getStoredVisualization().progressVariant
  )
  const [centerVariant, setCenterVariant] = useState<CenterVariant>(
    () => getStoredVisualization().centerVariant
  )
  const [labelVariantDropdownOpen, setLabelVariantDropdownOpen] = useState(false)
  const [progressVariantDropdownOpen, setProgressVariantDropdownOpen] = useState(false)
  const [centerVariantDropdownOpen, setCenterVariantDropdownOpen] = useState(false)
  const [footerDisplayMode, setFooterDisplayMode] = useState<FooterDisplayMode>(getStoredFooterDisplayMode)
  const [footerDisplayDropdownOpen, setFooterDisplayDropdownOpen] = useState(false)

  const { isFullscreen, toggleFullscreen, isSupported: isFullscreenSupported } = useFullscreen()

  const hideInfoTimeoutRef = useRef<number | null>(null)
  const breathModeRef = useRef<BreathMode>('normal')
  const transitionInProgressRef = useRef(false)
  const pendingDurationsRef = useRef<Record<Phase, number> | null>(null)
  const pendingBreathModeRef = useRef<BreathMode | null>(null)
  const [contentTransitionOpacity, setContentTransitionOpacity] = useState(1)

  const timer = useBreathTimer(durationsRef)
  const { phase, cycleCount, elapsedSeconds, prevPhase, labelAnimating, resetToInhale, reset, phaseRef, cycleCountRef, phaseStartTimeRef } = timer
  const { scale, sphereAnulomLeft, restart: restartAnimation } = useBreathAnimation(
    phaseRef,
    durationsRef,
    phaseStartTimeRef,
    breathModeRef,
    cycleCountRef,
    contentRevealed
  )
  const stackRef = useRef<HTMLDivElement>(null)
  const slot1Ref = useRef<HTMLDivElement>(null)
  const slot2Ref = useRef<HTMLDivElement>(null)
  const slot3Ref = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLElement>(null)

  const [slotTops, setSlotTops] = useState<[number, number, number]>([0, 0, 0])
  const [enteringText, setEnteringText] = useState(false)
  const [enteringDots, setEnteringDots] = useState(false)
  const [viewportSize, setViewportSize] = useState(() =>
    typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 0, h: 0 }
  )
  const prevMeasuredRef = useRef<BreathStack>([null, null, null])
  const isZoomSnapRef = useRef(false)

  useEffect(() => {
    const update = () => setViewportSize({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  /* ---------- Derived from model (view uses these) ---------- */
  const totalBreathSeconds =
    durations.INHALE + durations.HOLD_TOP + durations.EXHALE + durations.HOLD_BOTTOM
  const breathsPerMinute = totalBreathSeconds > 0 ? 60 / totalBreathSeconds : 0
  const textVisible = textVisibility === 2 || (textVisibility === 1 && showInfo)
  const dotsVisible = dotsVisibility === 2 || (dotsVisibility === 1 && showInfo)
  const sphereVisible = sphereVisibility === 2 || (sphereVisibility === 1 && showInfo)
  const cyclesVisible = cyclesVisibility === 2 || (cyclesVisibility === 1 && showInfo)
  const contentVisible = initialDelayPassed && contentRevealed

  const {
    displayTextVisible,
    displayDotsVisible,
    displaySphereVisible,
    displayCyclesVisible,
    stackTextVisible,
    stackDotsVisible,
    stackSphereVisible,
  } = useVisibilityWithDelays({ text: textVisible, dots: dotsVisible, sphere: sphereVisible, cycles: cyclesVisible })

  const stack = useMemo(
    () => buildBreathStack({ text: stackTextVisible, dots: stackDotsVisible, sphere: stackSphereVisible }),
    [stackTextVisible, stackDotsVisible, stackSphereVisible]
  )

  const measureSlots = (snap = false) => {
    const stackEl = stackRef.current
    const s1 = slot1Ref.current
    const s2 = slot2Ref.current
    const s3 = slot3Ref.current
    if (!stackEl || !s1 || !s2 || !s3) return
    if (snap) isZoomSnapRef.current = true
    const stackRect = stackEl.getBoundingClientRect()
    const getTop = (el: HTMLElement) => el.getBoundingClientRect().top - stackRect.top
    setSlotTops([getTop(s1), getTop(s2), getTop(s3)])
  }

  useLayoutEffect(() => {
    measureSlots()
    const prev = prevMeasuredRef.current
    setEnteringText(isEntering(prev, stack, 'text'))
    setEnteringDots(isEntering(prev, stack, 'dots'))
    prevMeasuredRef.current = stack
  }, [stack, contentVisible])

  /* Re-measure on resize/zoom so sphere, text, dots stay correctly positioned; snap to avoid lag */
  useEffect(() => {
    const stack = stackRef.current
    if (!stack) return
    const ro = new ResizeObserver(() => measureSlots(true))
    ro.observe(stack)
    const onResize = () => measureSlots(true)
    window.visualViewport?.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('scroll', onResize)
    return () => {
      ro.disconnect()
      window.visualViewport?.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('scroll', onResize)
    }
  }, [])

  useLayoutEffect(() => {
    if (isZoomSnapRef.current) isZoomSnapRef.current = false
  }, [slotTops])

  /* Use stack (not measuredStack) for viewport positions: measuredStack lags one render,
     so when dots turn off, text would stay at 25vh instead of moving to 35vh. */
  const textTopVh = getViewportTopVh(stack, 'text', viewportSize.h, viewportSize.w)
  const dotsTopVh = getViewportTopVh(stack, 'dots', viewportSize.h, viewportSize.w)

  const showFloatingText = stackTextVisible && isInStack(stack, 'text')
  const showFloatingDots = stackDotsVisible && isInStack(stack, 'dots')

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
      /* Sync animation to spawn: sphere starts at smallest size (beginning of inhale) */
      phaseStartTimeRef.current = performance.now()
      restartAnimation()
    }, 1000)
    return () => window.clearTimeout(t)
  }, [restartAnimation])

  /* ---------- Controller: on any setting change (after initial reveal), fade out 0.5s (animation keeps running), then reset and fade in ---------- */
  useEffect(() => {
    if (!hasContentBeenRevealedRef.current) return
    transitionInProgressRef.current = true
    setContentTransitionOpacity(0)
    const t = window.setTimeout(() => {
      if (pendingDurationsRef.current) {
        durationsRef.current = pendingDurationsRef.current
        pendingDurationsRef.current = null
      }
      if (pendingBreathModeRef.current !== null) {
        breathModeRef.current = pendingBreathModeRef.current
        pendingBreathModeRef.current = null
      }
      transitionInProgressRef.current = false
      resetToInhale()
      reset()
      restartAnimation()
      setContentTransitionOpacity(1)
      setShowInfo(true)
    }, 1000)
    return () => window.clearTimeout(t)
  }, [
    timingMode,
    multiplierSeconds,
    breathMode,
    durations.INHALE,
    durations.HOLD_TOP,
    durations.EXHALE,
    durations.HOLD_BOTTOM,
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
    if (transitionInProgressRef.current) {
      pendingDurationsRef.current = durations
      return
    }
    durationsRef.current = durations
  }, [durations])

  useDurationsSync(timingMode, multiplierSeconds, setDurations)

  // When durations are not all equal (box mode), set dots slider to Off.
  // Run after useDurationsSync so we see synced durations; skip when switching TO box
  // (durations may still be from previous mode before sync).
  const prevTimingModeRef = useRef<TimingMode>(timingMode)
  useEffect(() => {
    const prev = prevTimingModeRef.current
    prevTimingModeRef.current = timingMode
    if (timingMode !== 'box') return
    if (prev !== 'box') return // just switched to box, skip (durations may be stale)
    const allEqual =
      durations.INHALE === durations.HOLD_TOP &&
      durations.HOLD_TOP === durations.EXHALE &&
      durations.EXHALE === durations.HOLD_BOTTOM
    if (!allEqual && dotsVisibility !== 0) {
      setDotsVisibility(0)
      setDotsVisibilityAnimated(0)
    }
  }, [timingMode, durations, dotsVisibility])

  // When switching to custom, turn dots off (durations may differ)
  useEffect(() => {
    if (timingMode === 'custom') {
      setDotsVisibility(0)
      setDotsVisibilityAnimated(0)
    }
  }, [timingMode])

  useEffect(() => {
    if (transitionInProgressRef.current) {
      pendingBreathModeRef.current = breathMode
      return
    }
    breathModeRef.current = breathMode
  }, [breathMode])

  const handleContentClick = () => {
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
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg-page').trim()
      meta.setAttribute('content', bg || '#111')
    }
  }, [colorScheme])

  useEffect(() => {
    localStorage.setItem(BREATH_MODE_KEY, breathMode)
  }, [breathMode])

  useEffect(() => {
    localStorage.setItem(
      VISUALIZATION_KEY,
      JSON.stringify({ label: labelVariant, progress: progressVariant, center: centerVariant })
    )
  }, [labelVariant, progressVariant, centerVariant])

  useEffect(() => {
    localStorage.setItem(FOOTER_DISPLAY_KEY, footerDisplayMode)
  }, [footerDisplayMode])

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
      <aside ref={settingsRef} className={`settings ${showSettings ? 'settings--open' : ''}`} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()} aria-label={t('settings.ariaLabel')} aria-hidden={!showSettings}>
        <h2 className="settings-title">{t('settings.breathStyle')}</h2>
        <label className="settings-row">
          <span>{t('settings.nostrils')}</span>
          <SettingsDropdown
            options={[
              { value: 'normal' as const, label: t('breathModes.normal') },
              { value: 'anulom_vilom' as const, label: t('breathModes.anulom_vilom') },
            ]}
            selected={breathMode}
            onSelect={setBreathMode}
            ariaLabel={t('settings.breathStyleAria')}
            triggerLabel={breathMode === 'normal' ? t('breathModes.normal') : t('breathModes.anulom_vilom')}
            isOpen={breathModeDropdownOpen}
            onOpenChange={setBreathModeDropdownOpen}
          />
        </label>
        <label className="settings-row">
          <span>{t('settings.ratio')}</span>
          <SettingsDropdown
            options={[
              { value: 'long_exhale' as const, label: t('timingModes.long_exhale') },
              { value: 'equal' as const, label: t('timingModes.equal') },
              { value: 'kumbhaka' as const, label: t('timingModes.kumbhaka') },
              { value: 'box' as const, label: t('timingModes.box') },
              { value: 'custom' as const, label: t('timingModes.custom') },
            ]}
            selected={timingMode}
            onSelect={(mode) => handleTimingModeChange(mode)}
            ariaLabel={t('settings.ratio')}
            triggerLabel={t(`timingModes.${timingMode}`)}
            isOpen={timingModeDropdownOpen}
            onOpenChange={setTimingModeDropdownOpen}
          />
        </label>
        <label className={`settings-row ${timingMode === 'custom' ? 'settings-row--disabled' : ''}`}>
          <span>{t('settings.multiplier')}</span>
          <div className={`settings-duration-wrap ${timingMode === 'custom' ? 'settings-duration-wrap--disabled' : ''}`}>
            <button type="button" className="settings-duration-btn" disabled={timingMode === 'custom'} onClick={() => timingMode !== 'custom' && setMultiplierSeconds((v) => Math.max(0, v - 1))} aria-label={t('settings.decreaseMultiplier')}>−</button>
            <SlotInput
              value={multiplierDisplayValue}
              onChange={(e) => timingMode !== 'custom' && handleMultiplierChange(e.target.value)}
              onBlur={handleMultiplierBlur}
              disabled={timingMode === 'custom'}
              aria-label={t('settings.multiplier')}
            />
            <button type="button" className="settings-duration-btn" disabled={timingMode === 'custom'} onClick={() => timingMode !== 'custom' && setMultiplierSeconds((v) => Math.min(getMaxMultiplier(timingMode), v + 1))} aria-label={t('settings.increaseMultiplier')}>+</button>
          </div>
        </label>
        <div className="settings-duration-rows">
          <label className={`settings-row ${timingMode !== 'custom' ? 'settings-row--disabled' : ''}`}>
            <span>{t('settings.inhale')}</span>
            <div className="settings-duration-wrap">
              <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('INHALE', Math.max(0, durations.INHALE - 1))} aria-label={t('settings.decreaseInhale')}>−</button>
              <SlotInput
                value={durationDisplayValue('INHALE')}
                onChange={(e) => timingMode === 'custom' && handleDurationChange('INHALE', e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={() => timingMode === 'custom' && handleDurationBlur('INHALE')}
                disabled={timingMode !== 'custom'}
                aria-label={t('settings.inhaleDuration')}
              />
              <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('INHALE', Math.min(60, durations.INHALE + 1))} aria-label={t('settings.increaseInhale')}>+</button>
            </div>
          </label>
          <label className={`settings-row settings-row--duration ${timingMode !== 'custom' ? 'settings-row--disabled' : ''} ${(timingMode === 'custom' ? durations.HOLD_TOP === 0 : timingMode === 'equal' || timingMode === 'long_exhale') ? 'settings-row--collapsed' : ''} ${timingMode === 'custom' && durations.HOLD_TOP === 0 ? 'settings-row--zero' : ''}`}>
            <span>{t('settings.holdTop')}</span>
            <div className="settings-duration-wrap">
              <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('HOLD_TOP', Math.max(0, durations.HOLD_TOP - 1))} aria-label={t('settings.decreaseHoldTop')}>−</button>
              <SlotInput
                value={durationDisplayValue('HOLD_TOP')}
                onChange={(e) => timingMode === 'custom' && handleDurationChange('HOLD_TOP', e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={() => timingMode === 'custom' && handleDurationBlur('HOLD_TOP')}
                disabled={timingMode !== 'custom'}
                aria-label={t('settings.holdTopDuration')}
              />
              <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('HOLD_TOP', Math.min(60, durations.HOLD_TOP + 1))} aria-label={t('settings.increaseHoldTop')}>+</button>
            </div>
          </label>
          <label className={`settings-row ${timingMode !== 'custom' ? 'settings-row--disabled' : ''}`}>
            <span>{t('settings.exhale')}</span>
          <div className="settings-duration-wrap">
            <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('EXHALE', Math.max(0, durations.EXHALE - 1))} aria-label={t('settings.decreaseExhale')}>−</button>
            <SlotInput
              value={durationDisplayValue('EXHALE')}
              onChange={(e) => timingMode === 'custom' && handleDurationChange('EXHALE', e.target.value.replace(/\D/g, '').slice(0, 2))}
              onBlur={() => timingMode === 'custom' && handleDurationBlur('EXHALE')}
              disabled={timingMode !== 'custom'}
              aria-label={t('settings.exhaleDuration')}
            />
            <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('EXHALE', Math.min(60, durations.EXHALE + 1))} aria-label={t('settings.increaseExhale')}>+</button>
          </div>
          </label>
          <label className={`settings-row settings-row--duration ${timingMode !== 'custom' ? 'settings-row--disabled' : ''} ${(timingMode === 'custom' ? durations.HOLD_BOTTOM === 0 : timingMode !== 'box') ? 'settings-row--collapsed' : ''} ${timingMode === 'custom' && durations.HOLD_BOTTOM === 0 ? 'settings-row--zero' : ''}`}>
            <span>{t('settings.holdBottom')}</span>
            <div className="settings-duration-wrap">
              <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('HOLD_BOTTOM', Math.max(0, durations.HOLD_BOTTOM - 1))} aria-label={t('settings.decreaseHoldBottom')}>−</button>
              <SlotInput
                value={durationDisplayValue('HOLD_BOTTOM')}
                onChange={(e) => timingMode === 'custom' && handleDurationChange('HOLD_BOTTOM', e.target.value.replace(/\D/g, '').slice(0, 2))}
                onBlur={() => timingMode === 'custom' && handleDurationBlur('HOLD_BOTTOM')}
                disabled={timingMode !== 'custom'}
                aria-label={t('settings.holdBottomDuration')}
              />
              <button type="button" className="settings-duration-btn" disabled={timingMode !== 'custom'} onClick={() => timingMode === 'custom' && setDuration('HOLD_BOTTOM', Math.min(60, durations.HOLD_BOTTOM + 1))} aria-label={t('settings.increaseHoldBottom')}>+</button>
            </div>
          </label>
        </div>
        <div className="settings-row settings-row--bpm">
          <div className="settings-bpm-left">
            <span className="settings-bpm-label">{t('settings.bpm')}</span>
            <div className="settings-bpm-value-row">
              <div className="settings-bpm-value-wrap">
                {totalBreathSeconds > 0 ? (
                  <SlotDisplay
                    value={breathsPerMinute.toFixed(1)}
                    aria-label={t('settings.bpm')}
                  />
                ) : (
                  <SlotDisplay value="—" aria-label={t('settings.bpm')} />
                )}
              </div>
            </div>
          </div>
          <div className="settings-bpm-scale-column">
            <span className="settings-bpm-pace-label">{t('settings.pace')}</span>
            <div className="settings-bpm-slider-row">
              <span className="settings-bpm-triangle" aria-hidden />
              <div className="settings-bpm-scale-wrap">
              {totalBreathSeconds > 0 ? (
                <DifficultyScale bpm={breathsPerMinute} />
              ) : (
                <div className="difficulty-scale difficulty-scale--empty difficulty-scale--vertical" aria-label={t('settings.pace')}>
                  <span className="difficulty-scale__empty">—</span>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
        {/* ---------- Visibility: presets + Label/Progress/Center (replaces Text/Dots/Sphere) ---------- */}
        <h2 className="settings-title">{t('settings.visibility')}</h2>
        <div className="settings-row settings-row--presets">
          <div className="settings-presets">
            {(['classic', 'minimal'] as const).map((presetKey) => (
              <button
                key={presetKey}
                type="button"
                className={`settings-preset-btn ${labelVariant === PRESETS[presetKey].label && progressVariant === PRESETS[presetKey].progress && centerVariant === PRESETS[presetKey].center && footerDisplayMode === PRESETS[presetKey].footer ? 'settings-preset-btn--active' : ''}`}
                onClick={() => {
                  setLabelVariant(PRESETS[presetKey].label)
                  setProgressVariant(PRESETS[presetKey].progress)
                  setCenterVariant(PRESETS[presetKey].center)
                  setFooterDisplayMode(PRESETS[presetKey].footer)
                }}
                aria-label={t(`settings.presets.${presetKey}`)}
              >
                {t(`settings.presets.${presetKey}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row settings-row--slider">
          <SettingsDropdown
            options={LABEL_VARIANTS.map((v) => ({ value: v, label: t(`settings.labelVariants.${v}`) }))}
            selected={labelVariant}
            onSelect={setLabelVariant}
            ariaLabel={t('settings.labelVariantAria')}
            triggerLabel={t(`settings.labelVariants.${labelVariant}`)}
            isOpen={labelVariantDropdownOpen}
            onOpenChange={setLabelVariantDropdownOpen}
          />
          <VisibilitySlider
            value={textVisibility}
            valueAnimated={textVisibilityAnimated}
            onChange={getSliderHandlers('text').onChange}
            onPointerDown={getSliderHandlers('text').onPointerDown}
            onPointerUp={getSliderHandlers('text').onPointerUp}
            onPointerLeave={getSliderHandlers('text').onPointerLeave}
            ariaLabel={t('settings.phaseTextVisibility')}
          />
        </div>
        <div className={`settings-row settings-row--slider ${timingMode !== 'box' && timingMode !== 'equal' && timingMode !== 'long_exhale' && timingMode !== 'kumbhaka' ? 'settings-row--disabled' : ''}`}>
          <SettingsDropdown
            options={PROGRESS_VARIANTS.map((v) => ({ value: v, label: t(`settings.progressVariants.${v}`) }))}
            selected={progressVariant}
            onSelect={setProgressVariant}
            ariaLabel={t('settings.progressVariantAria')}
            triggerLabel={t(`settings.progressVariants.${progressVariant}`)}
            isOpen={progressVariantDropdownOpen}
            onOpenChange={setProgressVariantDropdownOpen}
          />
          <VisibilitySlider
            value={dotsVisibility}
            valueAnimated={dotsVisibilityAnimated}
            onChange={getSliderHandlers('dots').onChange}
            onPointerDown={getSliderHandlers('dots').onPointerDown}
            onPointerUp={getSliderHandlers('dots').onPointerUp}
            onPointerLeave={getSliderHandlers('dots').onPointerLeave}
            disabled={timingMode !== 'box' && timingMode !== 'equal' && timingMode !== 'long_exhale' && timingMode !== 'kumbhaka'}
            ariaLabel={t('settings.dotsVisibility')}
          />
        </div>
        <div className="settings-row settings-row--slider">
          <SettingsDropdown
            options={CENTER_VARIANTS.map((v) => ({ value: v, label: t(`settings.centerVariants.${v}`) }))}
            selected={centerVariant}
            onSelect={setCenterVariant}
            ariaLabel={t('settings.centerVariantAria')}
            triggerLabel={t(`settings.centerVariants.${centerVariant}`)}
            isOpen={centerVariantDropdownOpen}
            onOpenChange={setCenterVariantDropdownOpen}
          />
          <VisibilitySlider
            value={sphereVisibility}
            valueAnimated={sphereVisibilityAnimated}
            onChange={getSliderHandlers('sphere').onChange}
            onPointerDown={getSliderHandlers('sphere').onPointerDown}
            onPointerUp={getSliderHandlers('sphere').onPointerUp}
            onPointerLeave={getSliderHandlers('sphere').onPointerLeave}
            ariaLabel={t('settings.sphereVisibility')}
          />
        </div>
        <div className="settings-row settings-row--slider">
          <SettingsDropdown
            options={[
              { value: 'cycles' as const, label: t('footer.displayMode.cycles') },
              { value: 'time' as const, label: t('footer.displayMode.time') },
            ]}
            selected={footerDisplayMode}
            onSelect={setFooterDisplayMode}
            ariaLabel={t('footer.displayModeAria')}
            triggerLabel={footerDisplayMode === 'cycles' ? t('footer.displayMode.cycles') : t('footer.displayMode.time')}
            isOpen={footerDisplayDropdownOpen}
            onOpenChange={setFooterDisplayDropdownOpen}
          />
          <VisibilitySlider
            value={cyclesVisibility}
            valueAnimated={cyclesVisibilityAnimated}
            onChange={getSliderHandlers('cycles').onChange}
            onPointerDown={getSliderHandlers('cycles').onPointerDown}
            onPointerUp={getSliderHandlers('cycles').onPointerUp}
            onPointerLeave={getSliderHandlers('cycles').onPointerLeave}
            ariaLabel={t('settings.cyclesVisibility')}
            showLabels
          />
        </div>
        <h2 className="settings-title">{t('settings.colorScheme')}</h2>
        <label className="settings-row">
          <span>{t('settings.theme')}</span>
          <SettingsDropdown
            options={COLOR_SCHEMES.map((scheme) => ({ value: scheme, label: t(`themes.${schemeToThemeKey(scheme)}`) }))}
            selected={colorScheme}
            onSelect={setColorScheme}
            ariaLabel={t('settings.colorSchemeAria')}
            triggerLabel={t(`themes.${schemeToThemeKey(colorScheme)}`)}
            isOpen={colorSchemeDropdownOpen}
            onOpenChange={setColorSchemeDropdownOpen}
            dropup
            panelClassName="settings-dropdown__panel--themes"
          />
        </label>
        <h2 className="settings-title">{t('settings.language')}</h2>
        <label className="settings-row">
          <span>{t('settings.language')}</span>
          <SettingsDropdown
            options={[
              { value: 'en', label: t('languages.en') },
              { value: 'de', label: t('languages.de') },
              { value: 'ro', label: t('languages.ro') },
              { value: 'es', label: t('languages.es') },
              { value: 'fr', label: t('languages.fr') },
              { value: 'pt', label: t('languages.pt') },
              { value: 'it', label: t('languages.it') },
              { value: 'pl', label: t('languages.pl') },
              { value: 'ru', label: t('languages.ru') },
              { value: 'ja', label: t('languages.ja') },
              { value: 'zh', label: t('languages.zh') },
              { value: 'hi', label: t('languages.hi') },
            ]}
            selected={resolvedLang}
            onSelect={(lng) => i18n.changeLanguage(lng)}
            ariaLabel={t('settings.language')}
            triggerLabel={t(`languages.${resolvedLang}`)}
            isOpen={languageDropdownOpen}
            onOpenChange={setLanguageDropdownOpen}
            dropup
            panelClassName="settings-dropdown__panel--languages"
          />
        </label>
        <h2 className="settings-title">{t('settings.info')}</h2>
        <div className="settings-row">
          <button
            type="button"
            className="about-trigger"
            onClick={() => setShowAbout(true)}
            aria-label={t('about.openAria')}
          >
            {t('about.button')}
          </button>
        </div>
      </aside>
      {showAbout &&
        createPortal(
          <div
            className="about-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            onClick={() => setShowAbout(false)}
          >
            <div className="about-panel" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="about-close"
                onClick={() => setShowAbout(false)}
                aria-label={t('about.closeAria')}
              >
                ×
              </button>
              <h2 id="about-title" className="about-title">{t('about.title')}</h2>
              <div className="about-content">
                <p>{t('about.appDescription')}</p>
                <p>
                  {t('about.contact')}:{' '}
                  <a href="mailto:trisca.cezar@gmail.com" className="about-link">
                    trisca.cezar@gmail.com
                  </a>
                </p>
                <p>
                  {t('about.source')}:{' '}
                  <a href="https://github.com/triscacezar-droid/breath" target="_blank" rel="noopener noreferrer" className="about-link">
                    github.com/triscacezar-droid/breath
                  </a>
                </p>
              </div>
            </div>
          </div>,
          document.body
        )}
      <div className="content-wrap" onClick={handleContentClick}>
        <div className={`content-inner ${contentVisible ? 'content-inner--visible' : ''}`}>
        <div className="content-transition-wrap" style={{ opacity: contentTransitionOpacity, transition: 'opacity 0.5s ease' }}>
        <div className={`app-controls ${showInfo && contentVisible ? 'app-controls--visible' : ''}`} aria-hidden={!showInfo || !contentVisible}>
          <button type="button" className="app-controls__btn settings-trigger" onClick={(e) => { e.stopPropagation(); setShowSettings(true) }} onTouchStart={(e) => e.stopPropagation()} aria-label={t('settings.openSettings')}>
            <span className="settings-trigger-icon" aria-hidden />
          </button>
          {isFullscreenSupported && (
            <button
              type="button"
              className="app-controls__btn fullscreen-trigger"
              onClick={(e) => { e.stopPropagation(); toggleFullscreen() }}
              onTouchStart={(e) => e.stopPropagation()}
              aria-label={isFullscreen ? t('settings.exitFullscreen') : t('settings.enterFullscreen')}
            >
              <span className={`fullscreen-trigger-icon ${isFullscreen ? 'fullscreen-trigger-icon--exit' : ''}`} aria-hidden />
            </button>
          )}
        </div>
      <section className="session" aria-label={t('settings.sessionAria')}>
        <div
          ref={stackRef}
          className="breath-stack"
          aria-hidden={!contentVisible || (!stackTextVisible && !stackDotsVisible && !stackSphereVisible)}
        >
          <div ref={slot1Ref} className="breath-stack__slot">
            {stack[0] != null && (
              <div className={`breath-stack__spacer ${getSpacerClass(stack[0], 0)}`} aria-hidden />
            )}
          </div>
          <div ref={slot2Ref} className="breath-stack__slot">
            {stack[1] != null && (
              <div className={`breath-stack__spacer ${getSpacerClass(stack[1], 1)}`} aria-hidden />
            )}
          </div>
          <div ref={slot3Ref} className="breath-stack__slot breath-stack__slot--center">
            {stack[2] != null && (
              <div className={`breath-stack__spacer ${getSpacerClass(stack[2], 2)}`} aria-hidden />
            )}
          </div>
          <div className="breath-stack__floating" />
        </div>
        <div
          className="breath-stack__floating-viewport"
          aria-hidden={!contentVisible || (!stackTextVisible && !stackDotsVisible)}
        >
          {showFloatingText && (
            <div
              className={`breath-stack__float-item breath-stack__float-item--viewport ${enteringText ? 'breath-stack__float-item--entering' : ''}`}
              style={{
                top: `${textTopVh}vh`,
                transition: isZoomSnapRef.current ? 'none' : 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onAnimationEnd={() => enteringText && setEnteringText(false)}
            >
              <div className={`status ${contentVisible && displayTextVisible ? 'status--visible' : 'status--hidden'}`}>
                <div className={`phase-stack phase-stack--${labelVariant} ${labelAnimating && (phase === 'EXHALE' || phase === 'HOLD_BOTTOM') ? 'phase-stack--exhaling' : ''}`}>
                  {labelAnimating ? (
                    <>
                      <div className="phase-row phase-out" key="out">{getPhaseLabelDisplay(prevPhase, labelVariant)}</div>
                      <div className="phase-row phase-in" key="in">{getPhaseLabelDisplay(phase, labelVariant)}</div>
                    </>
                  ) : (
                    <div className="phase-row">{getPhaseLabelDisplay(phase, labelVariant)}</div>
                  )}
                </div>
              </div>
            </div>
          )}
          {showFloatingDots && (
            <div
              className={`breath-stack__float-item breath-stack__float-item--viewport ${enteringDots ? 'breath-stack__float-item--entering' : ''}`}
              style={{
                top: `${dotsTopVh}vh`,
                transition: isZoomSnapRef.current ? 'none' : 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onAnimationEnd={() => enteringDots && setEnteringDots(false)}
            >
              <div className={`phase-dots-wrap ${contentVisible && displayDotsVisible ? 'phase-dots-wrap--visible' : 'phase-dots-wrap--hidden'}`}>
                <PhaseDots phase={phase} duration={durations[phase]} phaseStartTimeRef={phaseStartTimeRef} progressVariant={progressVariant} timingMode={timingMode} durations={durations} breathMode={breathMode} cycleCount={cycleCount} />
              </div>
            </div>
          )}
        </div>
        {stack[2] === 'sphere' && (
          <div
            className={`circle circle--viewport-center ${centerVariant === 'ring' ? 'circle--ring' : ''} ${contentVisible && displaySphereVisible ? 'circle--visible' : 'circle--hidden'}`}
            data-phase={phase}
            style={{
              transform: `translate(-50%, -50%) scale(${scale})`,
              ...(breathMode === 'anulom_vilom' && { left: `${sphereAnulomLeft}%` }),
            }}
            aria-hidden
          />
        )}
      </section>
      <footer className={`cycles-footer ${contentVisible && (displayCyclesVisible || othersOnline !== null) ? 'cycles-footer--visible' : 'cycles-footer--hidden'}`} aria-hidden={!contentVisible || (!displayCyclesVisible && othersOnline === null)}>
        {displayCyclesVisible && (
          <span>
            {footerDisplayMode === 'cycles'
              ? t('footer.cyclesCompleted', { count: cycleCount })
              : formatElapsedSeconds(elapsedSeconds)}
          </span>
        )}
        {othersOnline !== null && (
          <span className="cycles-footer__presence">
            {othersOnline === 0 ? t('footer.noOneElse') : t('footer.othersBreathing', { count: othersOnline })}
          </span>
        )}
      </footer>
        </div>
        </div>
      </div>
    </main>
  )
}

export default App
