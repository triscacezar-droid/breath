import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Phase, TimingMode, BreathMode, ColorScheme, FooterDisplayMode, LabelVariant, ProgressVariant, CenterVariant, VisibilityMode } from '../types'
import {
  COLOR_SCHEMES,
  PRESETS,
  LABEL_VARIANTS,
  PROGRESS_VARIANTS,
  CENTER_VARIANTS,
  getMaxMultiplier,
  schemeToThemeKey,
} from '../constants'
import { SlotInput, SlotDisplay } from './SlotInput'
import { SettingsDropdown } from './SettingsDropdown'
import { VisibilitySlider } from './VisibilitySlider'
import { DifficultyScale } from '../DifficultyScale'

type SliderHandlers = {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPointerDown: () => void
  onPointerUp: () => void
  onPointerLeave: () => void
}

export interface SettingsPanelProps {
  showSettings: boolean
  breathMode: BreathMode
  setBreathMode: (v: BreathMode) => void
  breathModeDropdownOpen: boolean
  setBreathModeDropdownOpen: (v: boolean) => void
  timingMode: TimingMode
  handleTimingModeChange: (mode: TimingMode) => void
  timingModeDropdownOpen: boolean
  setTimingModeDropdownOpen: (v: boolean) => void
  setMultiplierSeconds: React.Dispatch<React.SetStateAction<number>>
  multiplierDisplayValue: string
  handleMultiplierChange: (value: string) => void
  handleMultiplierBlur: () => void
  durations: Record<Phase, number>
  setDuration: (p: Phase, value: number) => void
  durationDisplayValue: (p: Phase) => string
  handleDurationChange: (p: Phase, value: string) => void
  handleDurationBlur: (p: Phase) => void
  totalBreathSeconds: number
  breathsPerMinute: number
  labelVariant: LabelVariant
  setLabelVariant: (v: LabelVariant) => void
  progressVariant: ProgressVariant
  setProgressVariant: (v: ProgressVariant) => void
  centerVariant: CenterVariant
  setCenterVariant: (v: CenterVariant) => void
  footerDisplayMode: FooterDisplayMode
  setFooterDisplayMode: (v: FooterDisplayMode) => void
  labelVariantDropdownOpen: boolean
  setLabelVariantDropdownOpen: (v: boolean) => void
  progressVariantDropdownOpen: boolean
  setProgressVariantDropdownOpen: (v: boolean) => void
  centerVariantDropdownOpen: boolean
  setCenterVariantDropdownOpen: (v: boolean) => void
  footerDisplayDropdownOpen: boolean
  setFooterDisplayDropdownOpen: (v: boolean) => void
  textVisibility: VisibilityMode
  dotsVisibility: VisibilityMode
  sphereVisibility: VisibilityMode
  cyclesVisibility: VisibilityMode
  textVisibilityAnimated: number
  dotsVisibilityAnimated: number
  sphereVisibilityAnimated: number
  cyclesVisibilityAnimated: number
  getSliderHandlers: (id: 'text' | 'dots' | 'sphere' | 'cycles') => SliderHandlers
  colorScheme: ColorScheme
  setColorScheme: (v: ColorScheme) => void
  colorSchemeDropdownOpen: boolean
  setColorSchemeDropdownOpen: (v: boolean) => void
  resolvedLang: string
  languageDropdownOpen: boolean
  setLanguageDropdownOpen: (v: boolean) => void
  onOpenAbout: () => void
}

export const SettingsPanel = forwardRef<HTMLElement, SettingsPanelProps>(function SettingsPanel(props, ref) {
  const { t, i18n } = useTranslation()
  const {
    showSettings,
    breathMode,
    setBreathMode,
    breathModeDropdownOpen,
    setBreathModeDropdownOpen,
    timingMode,
    handleTimingModeChange,
    timingModeDropdownOpen,
    setTimingModeDropdownOpen,
    setMultiplierSeconds,
    multiplierDisplayValue,
    handleMultiplierChange,
    handleMultiplierBlur,
    durations,
    setDuration,
    durationDisplayValue,
    handleDurationChange,
    handleDurationBlur,
    totalBreathSeconds,
    breathsPerMinute,
    labelVariant,
    setLabelVariant,
    progressVariant,
    setProgressVariant,
    centerVariant,
    setCenterVariant,
    footerDisplayMode,
    setFooterDisplayMode,
    labelVariantDropdownOpen,
    setLabelVariantDropdownOpen,
    progressVariantDropdownOpen,
    setProgressVariantDropdownOpen,
    centerVariantDropdownOpen,
    setCenterVariantDropdownOpen,
    footerDisplayDropdownOpen,
    setFooterDisplayDropdownOpen,
    textVisibility,
    dotsVisibility,
    sphereVisibility,
    cyclesVisibility,
    textVisibilityAnimated,
    dotsVisibilityAnimated,
    sphereVisibilityAnimated,
    cyclesVisibilityAnimated,
    getSliderHandlers,
    colorScheme,
    setColorScheme,
    colorSchemeDropdownOpen,
    setColorSchemeDropdownOpen,
    resolvedLang,
    languageDropdownOpen,
    setLanguageDropdownOpen,
    onOpenAbout,
  } = props

  return (
    <aside
      ref={ref}
      className={`settings ${showSettings ? 'settings--open' : ''}`}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      aria-label={t('settings.ariaLabel')}
      aria-hidden={!showSettings}
    >
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
                <SlotDisplay value={breathsPerMinute.toFixed(1)} aria-label={t('settings.bpm')} />
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
        <button type="button" className="about-trigger" onClick={onOpenAbout} aria-label={t('about.openAria')}>
          {t('about.button')}
        </button>
      </div>
    </aside>
  )
})
