import './App.css'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Phase, VisibilityMode, TimingMode, BreathMode, ColorScheme, FooterDisplayMode, LabelVariant, ProgressVariant, CenterVariant } from './types'
import {
  DEFAULT_DURATIONS,
  BREATH_MODE_KEY,
  COLOR_SCHEME_KEY,
  VISUALIZATION_KEY,
  FOOTER_DISPLAY_KEY,
  getMaxMultiplier,
  INITIAL_DELAY_MS,
  SETTINGS_RESET_DELAY_MS,
  INFO_AUTO_HIDE_MS,
} from './constants'
import { getStoredColorScheme, getStoredBreathMode, getStoredVisualization, getStoredFooterDisplayMode, formatElapsedSeconds } from './utils'
import { buildBreathStack } from './breathStack'
import { SettingsPanel } from './components/SettingsPanel'
import { BreathSession } from './components/BreathSession'
import { useVisibilityLerp } from './hooks/useVisibilityLerp'
import { useVisibilityWithDelays } from './hooks/useVisibilityWithDelays'
import { useBreathTimer } from './hooks/useBreathTimer'
import { useBreathAnimation } from './hooks/useBreathAnimation'
import { useDurationsSync } from './hooks/useDurationsSync'
import { usePresence } from './hooks/usePresence'
import { useFullscreen } from './hooks/useFullscreen'
import { useTapHandlers } from './hooks/useTapHandlers'
import { useBreathStackLayout } from './hooks/useBreathStackLayout'
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
  const [dotsVisibility, setDotsVisibility] = useState<VisibilityMode>(1)
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
  const settingsRef = useRef<HTMLElement>(null)

  /* ---------- Derived from model (view uses these) ---------- */
  const totalBreathSeconds =
    durations.INHALE + durations.HOLD_TOP + durations.EXHALE + durations.HOLD_BOTTOM
  const breathsPerMinute = totalBreathSeconds > 0 ? 60 / totalBreathSeconds : 0
  const showOnTap = showInfo || showSettings
  const textVisible = textVisibility === 2 || (textVisibility === 1 && showOnTap)
  const dotsVisible = dotsVisibility === 2 || (dotsVisibility === 1 && showOnTap)
  const sphereVisible = sphereVisibility === 2 || (sphereVisibility === 1 && showOnTap)
  const cyclesVisible = cyclesVisibility === 2 || (cyclesVisibility === 1 && showOnTap)
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

  const footerShouldShow = contentVisible && (displayCyclesVisible || (othersOnline !== null && showOnTap))
  const [footerVisible, setFooterVisible] = useState(false)
  useLayoutEffect(() => {
    if (!footerShouldShow) {
      setFooterVisible(false)
      return
    }
    const raf = requestAnimationFrame(() => setFooterVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [footerShouldShow])

  const stack = useMemo(
    () => buildBreathStack({ text: stackTextVisible, dots: stackDotsVisible, sphere: stackSphereVisible }),
    [stackTextVisible, stackDotsVisible, stackSphereVisible]
  )

  const layout = useBreathStackLayout(stack, contentVisible, stackTextVisible, stackDotsVisible)
  const {
    stackRef,
    slot1Ref,
    slot2Ref,
    slot3Ref,
    enteringText,
    enteringDots,
    setEnteringText,
    setEnteringDots,
    textTopVh,
    dotsTopVh,
    showFloatingText,
    showFloatingDots,
    isZoomSnapRef,
  } = layout

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
    }, INITIAL_DELAY_MS)
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
    }, SETTINGS_RESET_DELAY_MS)
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
    }, INFO_AUTO_HIDE_MS)

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

  const { handleContentClick } = useTapHandlers(showSettings, setShowSettings, setShowInfo)

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
      <SettingsPanel
        ref={settingsRef}
        showSettings={showSettings}
        breathMode={breathMode}
        setBreathMode={setBreathMode}
        breathModeDropdownOpen={breathModeDropdownOpen}
        setBreathModeDropdownOpen={setBreathModeDropdownOpen}
        timingMode={timingMode}
        handleTimingModeChange={handleTimingModeChange}
        timingModeDropdownOpen={timingModeDropdownOpen}
        setTimingModeDropdownOpen={setTimingModeDropdownOpen}
        setMultiplierSeconds={setMultiplierSeconds}
        multiplierDisplayValue={multiplierDisplayValue}
        handleMultiplierChange={handleMultiplierChange}
        handleMultiplierBlur={handleMultiplierBlur}
        durations={durations}
        setDuration={setDuration}
        durationDisplayValue={durationDisplayValue}
        handleDurationChange={handleDurationChange}
        handleDurationBlur={handleDurationBlur}
        totalBreathSeconds={totalBreathSeconds}
        breathsPerMinute={breathsPerMinute}
        labelVariant={labelVariant}
        setLabelVariant={setLabelVariant}
        progressVariant={progressVariant}
        setProgressVariant={setProgressVariant}
        centerVariant={centerVariant}
        setCenterVariant={setCenterVariant}
        footerDisplayMode={footerDisplayMode}
        setFooterDisplayMode={setFooterDisplayMode}
        labelVariantDropdownOpen={labelVariantDropdownOpen}
        setLabelVariantDropdownOpen={setLabelVariantDropdownOpen}
        progressVariantDropdownOpen={progressVariantDropdownOpen}
        setProgressVariantDropdownOpen={setProgressVariantDropdownOpen}
        centerVariantDropdownOpen={centerVariantDropdownOpen}
        setCenterVariantDropdownOpen={setCenterVariantDropdownOpen}
        footerDisplayDropdownOpen={footerDisplayDropdownOpen}
        setFooterDisplayDropdownOpen={setFooterDisplayDropdownOpen}
        textVisibility={textVisibility}
        dotsVisibility={dotsVisibility}
        sphereVisibility={sphereVisibility}
        cyclesVisibility={cyclesVisibility}
        textVisibilityAnimated={textVisibilityAnimated}
        dotsVisibilityAnimated={dotsVisibilityAnimated}
        sphereVisibilityAnimated={sphereVisibilityAnimated}
        cyclesVisibilityAnimated={cyclesVisibilityAnimated}
        getSliderHandlers={getSliderHandlers}
        colorScheme={colorScheme}
        setColorScheme={setColorScheme}
        colorSchemeDropdownOpen={colorSchemeDropdownOpen}
        setColorSchemeDropdownOpen={setColorSchemeDropdownOpen}
        resolvedLang={resolvedLang}
        languageDropdownOpen={languageDropdownOpen}
        setLanguageDropdownOpen={setLanguageDropdownOpen}
        onOpenAbout={() => setShowAbout(true)}
      />
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
        <div className={`app-controls ${showOnTap && contentVisible ? 'app-controls--visible' : ''}`} aria-hidden={!showOnTap || !contentVisible}>
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
      <BreathSession
        stack={stack}
        stackRef={stackRef}
        slot1Ref={slot1Ref}
        slot2Ref={slot2Ref}
        slot3Ref={slot3Ref}
        phase={phase}
        prevPhase={prevPhase}
        labelAnimating={labelAnimating}
        labelVariant={labelVariant}
        scale={scale}
        sphereAnulomLeft={sphereAnulomLeft}
        breathMode={breathMode}
        durations={durations}
        phaseStartTimeRef={phaseStartTimeRef}
        progressVariant={progressVariant}
        timingMode={timingMode}
        cycleCount={cycleCount}
        contentVisible={contentVisible}
        displayTextVisible={displayTextVisible}
        displayDotsVisible={displayDotsVisible}
        displaySphereVisible={displaySphereVisible}
        stackTextVisible={stackTextVisible}
        stackDotsVisible={stackDotsVisible}
        stackSphereVisible={stackSphereVisible}
        showFloatingText={showFloatingText}
        showFloatingDots={showFloatingDots}
        enteringText={enteringText}
        enteringDots={enteringDots}
        setEnteringText={setEnteringText}
        setEnteringDots={setEnteringDots}
        textTopVh={textTopVh}
        dotsTopVh={dotsTopVh}
        isZoomSnapRef={isZoomSnapRef}
        centerVariant={centerVariant}
        footerVisible={footerVisible}
        footerShouldShow={footerShouldShow}
        displayCyclesVisible={displayCyclesVisible}
        footerDisplayMode={footerDisplayMode}
        elapsedSeconds={elapsedSeconds}
        othersOnline={othersOnline}
        showOnTap={showOnTap}
        t={t}
        formatElapsedSeconds={formatElapsedSeconds}
      />
        </div>
        </div>
      </div>
    </main>
  )
}

export default App
