import type { Phase, TimingMode } from './types'

export const DEFAULT_DURATIONS: Record<Phase, number> = {
  INHALE: 5,
  HOLD_TOP: 5,
  EXHALE: 5,
  HOLD_BOTTOM: 5,
}

export const MIN_SCALE = 0.01
export const MAX_SCALE = 0.5

export const KUMBHAKA_RATIO: Record<Phase, number> = {
  INHALE: 1,
  HOLD_TOP: 4,
  EXHALE: 2,
  HOLD_BOTTOM: 0,
}

export const EQUAL_RATIO: Record<Phase, number> = {
  INHALE: 1,
  HOLD_TOP: 0,
  EXHALE: 1,
  HOLD_BOTTOM: 0,
}

export const LONG_EXHALE_RATIO: Record<Phase, number> = {
  INHALE: 1,
  HOLD_TOP: 0,
  EXHALE: 2,
  HOLD_BOTTOM: 0,
}

export const BREATH_MODE_KEY = 'breath-mode'
export const COLOR_SCHEME_KEY = 'breath-color-scheme'
export const VISUALIZATION_KEY = 'breath-visualization'
export const FOOTER_DISPLAY_KEY = 'breath-footer-display'

export const LABEL_VARIANTS = ['words', 'icons'] as const
export const PROGRESS_VARIANTS = ['dots', 'squares'] as const
export const CENTER_VARIANTS = ['circle', 'ring', 'aum'] as const

export const PRESETS = {
  classic: { label: 'words' as const, progress: 'dots' as const, center: 'circle' as const, footer: 'cycles' as const },
  minimal: { label: 'icons' as const, progress: 'squares' as const, center: 'ring' as const, footer: 'time' as const },
} as const

export const COLOR_SCHEMES = [
  'dark',
  'black-and-white',
  'light',
  'sepia',
  'dracula',
  'monokai',
  'solarized-dark',
  'solarized-light',
  'one-dark',
  'one-light',
  'nord',
  'gruvbox-dark',
  'gruvbox-light',
  'tokyo-night',
  'catppuccin-mocha',
  'catppuccin-latte',
  'night-owl',
  'github-dark',
  'github-light',
  'rose-pine',
  'forest',
  'cyberpunk',
  'zenburn',
  'shades-of-purple',
  'synthwave-84',
  'kanagawa',
  'ayu-dark',
  'horizon',
  'palenight',
  'red-dark',
  'burgundy',
] as const

/** Maps color scheme key to themes.* translation key (e.g. 'solarized-dark' -> 'solarizedDark') */
export function schemeToThemeKey(scheme: (typeof COLOR_SCHEMES)[number]): string {
  return scheme
    .split('-')
    .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join('')
}

export const SLOT_ANIMATION_MS = 260

/** Delay before initial content reveal (ms) */
export const INITIAL_DELAY_MS = 1000
/** Delay for settings reset transition (ms) */
export const SETTINGS_RESET_DELAY_MS = 1000
/** Auto-hide info overlay after inactivity (ms) */
export const INFO_AUTO_HIDE_MS = 10_000

export function getMaxMultiplier(timingMode: TimingMode): number {
  if (timingMode === 'kumbhaka') return 15
  if (timingMode === 'long_exhale' || timingMode === 'equal') return 30
  return 60
}
