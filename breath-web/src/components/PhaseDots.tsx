import type { Phase, TimingMode, BreathMode } from '../types'

export function PhaseDots({
  phase,
  duration,
  secondsLeft,
  timingMode,
  durations,
  breathMode,
  cycleCount,
}: {
  phase: Phase
  duration: number
  secondsLeft: number
  timingMode: TimingMode
  durations?: Record<Phase, number>
  breathMode?: BreathMode
  cycleCount?: number
}) {
  const elapsedSeconds = Math.max(0, Math.min(duration, duration - secondsLeft))
  const isSimple = timingMode === 'equal'
  const isLongExhale = timingMode === 'long_exhale'
  const isKumbhaka = timingMode === 'kumbhaka'
  /* Anulom Vilom: right nostril (cycle even) = L→R, left nostril (cycle odd) = R→L */
  const dotsRtl = breathMode === 'anulom_vilom' && (cycleCount ?? 0) % 2 === 1
  /* 1:2: fixed count; 1:4:2: 4 dots per inhale second (4*inhale), 1 yellow per hold second, 2 disappear per exhale second */
  const dotCount = isKumbhaka && durations
    ? 4 * durations.INHALE
    : isLongExhale && durations
      ? Math.max(durations.INHALE, durations.EXHALE)
      : duration
  const dots = Array.from({ length: dotCount }, (_, i) => i)

  return (
    <div className="phase-dots" aria-hidden>
      {dots.map((i) => {
        let visible = true
        let isYellow = false

        if (isSimple) {
          /* 1:1 ratio: L→R or R→L based on nostril */
          switch (phase) {
            case 'INHALE':
              visible = dotsRtl ? i >= duration - elapsedSeconds : i < elapsedSeconds
              break
            case 'EXHALE':
              visible = dotsRtl ? i < duration - elapsedSeconds : i >= elapsedSeconds
              break
            default:
              visible = false
          }
        } else if (isLongExhale) {
          /* 1:2 ratio: L→R or R→L based on nostril */
          const inhaleProgress = Math.min(dotCount, Math.floor(elapsedSeconds) * 2)
          switch (phase) {
            case 'INHALE':
              visible = dotsRtl ? i >= dotCount - inhaleProgress : i < inhaleProgress
              break
            case 'EXHALE':
              visible = dotsRtl ? i < dotCount - elapsedSeconds : i >= elapsedSeconds
              break
            default:
              visible = false
          }
        } else if (isKumbhaka) {
          /* 1:4:2: 4 dots per inhale second, 1 yellow per hold second, 2 disappear at a time (keep yellow) */
          const inhaleVisibleCount = Math.min(dotCount, Math.floor(elapsedSeconds) * 4)
          const holdYellowCount = Math.floor(elapsedSeconds)
          const exhaleHiddenCount = Math.floor(elapsedSeconds) * 2
          switch (phase) {
            case 'INHALE':
              /* 4 dots appear for each inhalation second */
              visible = dotsRtl ? i >= dotCount - inhaleVisibleCount : i < inhaleVisibleCount
              isYellow = false
              break
            case 'HOLD_TOP':
              /* One dot turns yellow per hold second */
              visible = true
              isYellow = dotsRtl ? i >= dotCount - holdYellowCount : i < holdYellowCount
              break
            case 'EXHALE':
              /* Two disappear at a time, keep yellow as they disappear */
              visible = dotsRtl ? i < dotCount - exhaleHiddenCount : i >= exhaleHiddenCount
              isYellow = true
              break
            default:
              visible = false
          }
        } else {
          /* 1:1:1:1 box: L→R or R→L based on nostril; holds show yellow progress */
          switch (phase) {
            case 'INHALE':
              visible = dotsRtl ? i >= duration - elapsedSeconds : i < elapsedSeconds
              isYellow = false
              break
            case 'HOLD_TOP':
              visible = true
              isYellow = dotsRtl ? i >= duration - elapsedSeconds : i < elapsedSeconds
              break
            case 'EXHALE':
              visible = true
              isYellow = dotsRtl ? i < duration - elapsedSeconds : i >= elapsedSeconds
              break
            case 'HOLD_BOTTOM':
              visible = dotsRtl ? i < duration - elapsedSeconds : i >= elapsedSeconds
              isYellow = false
              break
          }
        }

        const colorClass =
          isSimple || isLongExhale ? 'phase-dot--white' : isYellow ? 'phase-dot--yellow' : 'phase-dot--white'
        return (
          <span
            key={i}
            className={`phase-dot ${visible ? 'phase-dot--visible' : ''} ${colorClass}`}
          />
        )
      })}
    </div>
  )
}
