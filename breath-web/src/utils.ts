import type { Phase } from './types'
import { MIN_SCALE, MAX_SCALE, COLOR_SCHEMES, COLOR_SCHEME_KEY, BREATH_MODE_KEY } from './constants'
import type { ColorScheme } from './types'
import type { BreathMode } from './types'
import i18n from './i18n'

export function easeInOut(t: number) {
  const p = Math.max(0, Math.min(1, t))
  return p * p * (3 - 2 * p)
}

export function lerpScale(t: number) {
  return MIN_SCALE + (MAX_SCALE - MIN_SCALE) * easeInOut(t)
}

export function nextPhase(phase: Phase): Phase {
  switch (phase) {
    case 'INHALE':
      return 'HOLD_TOP'
    case 'HOLD_TOP':
      return 'EXHALE'
    case 'EXHALE':
      return 'HOLD_BOTTOM'
    case 'HOLD_BOTTOM':
      return 'INHALE'
  }
}

function phaseToKey(phase: Phase): 'inhale' | 'hold' | 'exhale' {
  switch (phase) {
    case 'INHALE':
      return 'inhale'
    case 'HOLD_TOP':
    case 'HOLD_BOTTOM':
      return 'hold'
    case 'EXHALE':
      return 'exhale'
  }
}

export function phaseLabel(phase: Phase) {
  return i18n.t(`phases.${phaseToKey(phase)}`)
}

export function getStoredColorScheme(): ColorScheme {
  const s = localStorage.getItem(COLOR_SCHEME_KEY)
  if (s && COLOR_SCHEMES.includes(s as ColorScheme)) return s as ColorScheme
  return 'dark'
}

export function getStoredBreathMode(): BreathMode {
  const s = localStorage.getItem(BREATH_MODE_KEY)
  if (s === 'normal' || s === 'anulom_vilom') return s
  return 'normal'
}
