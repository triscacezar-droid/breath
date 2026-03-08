export type Phase = 'INHALE' | 'HOLD_TOP' | 'EXHALE' | 'HOLD_BOTTOM'

/** 0 = off, 1 = visible on tap, 2 = always visible */
export type VisibilityMode = 0 | 1 | 2

/** Box = equal phases; Equal = 1:1 (inhale:exhale, no holds); Kumbhaka = 1:4:2:0; Long Exhale = 1:0:2:0; Custom = user values */
export type TimingMode = 'box' | 'equal' | 'kumbhaka' | 'long_exhale' | 'custom'

export type BreathMode = 'normal' | 'anulom_vilom'

export type ColorScheme =
  | 'dark'
  | 'light'
  | 'sepia'
  | 'dracula'
  | 'monokai'
  | 'solarized-dark'
  | 'solarized-light'
  | 'one-dark'
  | 'one-light'
  | 'nord'
  | 'gruvbox-dark'
  | 'gruvbox-light'
  | 'tokyo-night'
  | 'catppuccin-mocha'
  | 'night-owl'
  | 'github-dark'
  | 'github-light'
  | 'rose-pine'
  | 'forest'
  | 'cyberpunk'
