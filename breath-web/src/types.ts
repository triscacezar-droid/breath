export type Phase = 'INHALE' | 'HOLD_TOP' | 'EXHALE' | 'HOLD_BOTTOM'

/** 0 = off, 1 = visible on tap, 2 = always visible */
export type VisibilityMode = 0 | 1 | 2

/** Footer display: cycles count or elapsed time */
export type FooterMode = 'cycles' | 'time'

/** Box = equal phases; Equal = 1:1 (inhale:exhale, no holds); Kumbhaka = 1:4:2:0; Long Exhale = 1:0:2:0; Custom = user values */
export type TimingMode = 'box' | 'equal' | 'kumbhaka' | 'long_exhale' | 'custom'

export type BreathMode = 'normal' | 'anulom_vilom'

export type LabelVariant = 'words' | 'icons' | 'minimal'
export type ProgressVariant = 'dots' | 'bar' | 'arc'
export type CenterVariant = 'circle' | 'ring' | 'wave'

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
  | 'catppuccin-latte'
  | 'night-owl'
  | 'github-dark'
  | 'github-light'
  | 'rose-pine'
  | 'forest'
  | 'cyberpunk'
  | 'zenburn'
  | 'shades-of-purple'
  | 'synthwave-84'
  | 'kanagawa'
  | 'ayu-dark'
  | 'horizon'
  | 'palenight'
  | 'red-dark'
  | 'burgundy'
