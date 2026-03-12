import type { VisibilityMode } from '../types'
import { useTranslation } from 'react-i18next'

const VISIBILITY_KEYS = ['off', 'onTap', 'on'] as const

export function VisibilitySlider({
  value,
  valueAnimated,
  onChange,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  disabled,
  ariaLabel,
  showLabels,
}: {
  value: VisibilityMode
  valueAnimated: number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPointerDown: () => void
  onPointerUp: () => void
  onPointerLeave: () => void
  disabled?: boolean
  ariaLabel: string
  showLabels?: boolean
}) {
  const { t } = useTranslation()
  const mode = Math.round(valueAnimated)
  const ariaValueText = t(`visibility.${VISIBILITY_KEYS[value]}`)
  return (
    <div className={`settings-slider-wrap ${mode === 0 ? 'settings-slider-wrap--off' : ''}`}>
      <div className="settings-slider-clip">
        <input
          type="range"
          min={0}
          max={2}
          step={0.01}
          value={valueAnimated}
          disabled={disabled}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          onChange={onChange}
          aria-label={ariaLabel}
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={value}
          aria-valuetext={ariaValueText}
          className={`settings-slider settings-slider--mode-${mode}`}
        />
      </div>
      <div className={`settings-slider-labels ${showLabels ? '' : 'settings-slider-labels--hidden'}`} aria-hidden>
        <span>{t('visibility.off')}</span>
        <span>{t('visibility.onTap')}</span>
        <span>{t('visibility.on')}</span>
      </div>
    </div>
  )
}
