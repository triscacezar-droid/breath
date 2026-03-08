import { useRef } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'

export type SettingsDropdownOption<T> = { value: T; label: string }

export function SettingsDropdown<T extends string>({
  options,
  selected,
  onSelect,
  ariaLabel,
  triggerLabel,
  isOpen,
  onOpenChange,
  dropup,
  panelClassName,
}: {
  options: readonly SettingsDropdownOption<T>[]
  selected: T
  onSelect: (value: T) => void
  ariaLabel: string
  triggerLabel: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  dropup?: boolean
  panelClassName?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, isOpen, () => onOpenChange(false))

  return (
    <div
      ref={containerRef}
      className={`settings-dropdown ${dropup ? 'settings-dropdown--dropup' : ''}`}
    >
      <button
        type="button"
        className="settings-dropdown__trigger"
        onClick={() => onOpenChange(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
      >
        {triggerLabel}
        <span className="settings-dropdown__chevron" aria-hidden>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      <div
        className={`settings-dropdown__panel ${panelClassName ?? ''} ${isOpen ? 'settings-dropdown__panel--open' : ''}`}
        role="listbox"
      >
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={selected === opt.value}
            className="settings-dropdown__option"
            onClick={() => {
              onSelect(opt.value)
              onOpenChange(false)
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
