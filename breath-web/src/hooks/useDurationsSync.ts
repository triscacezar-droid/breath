import { useEffect } from 'react'
import type { Phase, TimingMode } from '../types'
import { getMaxMultiplier } from '../constants'
import { EQUAL_RATIO, KUMBHAKA_RATIO, LONG_EXHALE_RATIO } from '../constants'

export function useDurationsSync(
  timingMode: TimingMode,
  multiplierSeconds: number,
  setDurations: React.Dispatch<React.SetStateAction<Record<Phase, number>>>
) {
  useEffect(() => {
    if (timingMode === 'custom') return
    const maxM = getMaxMultiplier(timingMode)
    const m = Math.max(0, Math.min(maxM, multiplierSeconds))
    if (timingMode === 'box') {
      setDurations(() => ({ INHALE: m, HOLD_TOP: m, EXHALE: m, HOLD_BOTTOM: m }))
    } else if (timingMode === 'equal') {
      setDurations(() => ({
        INHALE: Math.min(60, Math.round(EQUAL_RATIO.INHALE * m)),
        HOLD_TOP: Math.min(60, Math.round(EQUAL_RATIO.HOLD_TOP * m)),
        EXHALE: Math.min(60, Math.round(EQUAL_RATIO.EXHALE * m)),
        HOLD_BOTTOM: Math.min(60, Math.round(EQUAL_RATIO.HOLD_BOTTOM * m)),
      }))
    } else if (timingMode === 'long_exhale') {
      setDurations(() => ({
        INHALE: Math.min(60, Math.round(LONG_EXHALE_RATIO.INHALE * m)),
        HOLD_TOP: Math.min(60, Math.round(LONG_EXHALE_RATIO.HOLD_TOP * m)),
        EXHALE: Math.min(60, Math.round(LONG_EXHALE_RATIO.EXHALE * m)),
        HOLD_BOTTOM: Math.min(60, Math.round(LONG_EXHALE_RATIO.HOLD_BOTTOM * m)),
      }))
    } else {
      setDurations(() => ({
        INHALE: Math.min(60, Math.round(KUMBHAKA_RATIO.INHALE * m)),
        HOLD_TOP: Math.min(60, Math.round(KUMBHAKA_RATIO.HOLD_TOP * m)),
        EXHALE: Math.min(60, Math.round(KUMBHAKA_RATIO.EXHALE * m)),
        HOLD_BOTTOM: Math.min(60, Math.round(KUMBHAKA_RATIO.HOLD_BOTTOM * m)),
      }))
    }
  }, [timingMode, multiplierSeconds, setDurations])
}
