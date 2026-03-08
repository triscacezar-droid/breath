import type { Phase } from './types'
import {
  MIN_SCALE,
  MAX_SCALE,
  COLOR_SCHEMES,
  COLOR_SCHEME_KEY,
  BREATH_MODE_KEY,
  VISUALIZATION_KEY,
  LABEL_VARIANTS,
  PROGRESS_VARIANTS,
  CENTER_VARIANTS,
  PRESETS,
} from './constants'
import type { ColorScheme, LabelVariant, ProgressVariant, CenterVariant } from './types'
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

export interface StoredVisualization {
  labelVariant: LabelVariant
  progressVariant: ProgressVariant
  centerVariant: CenterVariant
}

export function getStoredVisualization(): StoredVisualization {
  const classic = { labelVariant: PRESETS.classic.label, progressVariant: PRESETS.classic.progress, centerVariant: PRESETS.classic.center }
  try {
    const s = localStorage.getItem(VISUALIZATION_KEY)
    if (!s) return classic
    const parsed = JSON.parse(s) as Record<string, string>
    return {
      labelVariant: LABEL_VARIANTS.includes(parsed?.label as LabelVariant)
        ? (parsed.label as LabelVariant)
        : classic.labelVariant,
      progressVariant: PROGRESS_VARIANTS.includes(parsed?.progress as ProgressVariant)
        ? (parsed.progress as ProgressVariant)
        : classic.progressVariant,
      centerVariant: CENTER_VARIANTS.includes(parsed?.center as CenterVariant)
        ? (parsed.center as CenterVariant)
        : classic.centerVariant,
    }
  } catch {
    return classic
  }
}

