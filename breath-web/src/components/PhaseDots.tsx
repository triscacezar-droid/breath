import { useEffect, useState } from 'react'
import type { Phase, TimingMode, BreathMode, ProgressVariant } from '../types'

const MID_SECOND_OFFSET = 0.5

export function PhaseDots({
  phase,
  duration,
  secondsLeft,
  phaseStartTimeRef,
  progressVariant,
  timingMode,
  durations,
  breathMode,
  cycleCount,
}: {
  phase: Phase
  duration: number
  secondsLeft: number
  phaseStartTimeRef: React.MutableRefObject<number>
  progressVariant: ProgressVariant
  timingMode: TimingMode
  durations?: Record<Phase, number>
  breathMode?: BreathMode
  cycleCount?: number
}) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    let raf: number
    const tick = () => {
      const e = Math.max(0, (performance.now() - phaseStartTimeRef.current) / 1000)
      setElapsed(Math.min(duration, e))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, duration, phaseStartTimeRef])
  useEffect(() => {
    setElapsed(0)
  }, [phase])
  /* Dots appear at mid-second: 0.5, 1.5, 2.5... effective count = floor(elapsed - 0.5) + 1 when elapsed >= 0.5 */
  const elapsedSeconds =
    elapsed >= MID_SECOND_OFFSET
      ? Math.min(duration, Math.floor(elapsed - MID_SECOND_OFFSET) + 1)
      : 0
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
  /* Strictly more than 8*x -> x+1 rows. So >8->2, >16->3, >24->4, ... */
  const rowCount = dotCount > 8 ? 1 + Math.floor((dotCount - 1) / 8) : 1

  /* Snake pattern: groups of rowCount, alternating forward/backward per group */
  const getRowForIndex = (i: number) => {
    const groupIndex = Math.floor(i / rowCount)
    const positionInGroup = i % rowCount
    return groupIndex % 2 === 0 ? positionInGroup : rowCount - 1 - positionInGroup
  }
  const rowIndices = Array.from({ length: rowCount }, () => [] as number[])
  dots.forEach((_, i) => rowIndices[getRowForIndex(i)].push(i))

  const renderDot = (i: number) => {
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
  }

  const shapeClass = progressVariant === 'squares' ? 'phase-dots--squares' : 'phase-dots--dots'
  return (
    <div className={`phase-dots ${shapeClass} ${rowCount > 1 ? 'phase-dots--multi-row' : ''}`} aria-hidden>
      {rowIndices.map((indices, row) => (
        <div key={row} className="phase-dots__row">
          {indices.map((i) => renderDot(i))}
        </div>
      ))}
    </div>
  )
}
