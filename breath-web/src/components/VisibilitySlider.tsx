import type { VisibilityMode } from '../types'

const VISIBILITY_LABELS = ['Off', 'On tap', 'On'] as const

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
  const mode = Math.round(valueAnimated)
  return (
    <div className={`settings-slider-wrap ${mode === 0 ? 'settings-slider-wrap--off' : ''}`}>
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
        aria-valuetext={VISIBILITY_LABELS[value]}
        className={`settings-slider settings-slider--mode-${mode}`}
      />
      {showLabels && (
        <div className="settings-slider-labels" aria-hidden>
          <span>Off</span>
          <span>On tap</span>
          <span>On</span>
        </div>
      )}
    </div>
  )
}
