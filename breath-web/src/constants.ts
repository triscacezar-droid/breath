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

export const TIMING_MODE_LABELS: Record<TimingMode, string> = {
  box: '1:1:1:1',
  equal: '1:1',
  kumbhaka: '1:4:2',
  long_exhale: '1:2',
  custom: 'Custom',
}

export const BREATH_MODE_KEY = 'breath-mode'
export const COLOR_SCHEME_KEY = 'breath-color-scheme'

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

export const THEME_LABELS: Record<(typeof COLOR_SCHEMES)[number], string> = {
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
  'catppuccin-latte': 'Catppuccin Latte',
  'night-owl': 'Night Owl',
  'github-dark': 'GitHub Dark',
  'github-light': 'GitHub Light',
  'rose-pine': 'Rose Pine',
  forest: 'Forest',
  cyberpunk: 'Cyberpunk',
  zenburn: 'Zenburn',
  'shades-of-purple': 'Shades of Purple',
  'synthwave-84': "SynthWave '84",
  kanagawa: 'Kanagawa',
  'ayu-dark': 'Ayu Dark',
  horizon: 'Horizon',
  palenight: 'Palenight',
  'red-dark': 'Red Dark',
  burgundy: 'Burgundy',
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
