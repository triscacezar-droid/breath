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

export const LABEL_VARIANTS = ['words', 'icons', 'minimal'] as const
export const PROGRESS_VARIANTS = ['dots', 'bar', 'arc'] as const
export const CENTER_VARIANTS = ['circle', 'ring', 'wave'] as const

export const PRESETS = {
  classic: { label: 'words' as const, progress: 'dots' as const, center: 'circle' as const },
  minimal: { label: 'icons' as const, progress: 'bar' as const, center: 'ring' as const },
  abstract: { label: 'minimal' as const, progress: 'arc' as const, center: 'wave' as const },
} as const

export const COLOR_SCHEMES = [
  'dark',
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

const HAS_TOUCH = typeof window !== 'undefined' && 'ontouchstart' in window
/** Double-tap window: longer on touch devices (finger latency) */
export const DOUBLE_TAP_WINDOW_MS = HAS_TOUCH ? 500 : 350

export const SLOT_ANIMATION_MS = 260

export function getMaxMultiplier(timingMode: TimingMode): number {
  if (timingMode === 'kumbhaka') return 15
  if (timingMode === 'long_exhale' || timingMode === 'equal') return 30
  return 60
}
