const ZONES = [
  { label: 'Very difficult', width: 72 },
  { label: 'Difficult', width: 56 },
  { label: 'Moderate', width: 56 },
  { label: 'Easy', width: 28 },
] as const

const BPM_MAX = 10
const VIEWPORT_HALF = 58

/** BPM → strip position. Compact strip, labels like text with spaces. */
function bpmToPosition(bpm: number): number {
  if (bpm <= 0) return 0
  if (bpm <= 1) return (bpm / 1) * 72
  if (bpm <= 2) return 76 + ((bpm - 1) / 1) * 56
  if (bpm <= 4) return 136 + ((bpm - 2) / 2) * 56
  return 196 + ((bpm - 4) / 6) * 28
}

export function DifficultyScale({ bpm }: { bpm: number }) {
  const clampedBpm = Math.max(0, Math.min(BPM_MAX, bpm))
  const position = bpmToPosition(clampedBpm)
  const translateX = VIEWPORT_HALF - position

  return (
    <div className="difficulty-scale" role="img" aria-label={`Difficulty: ${getCurrentZone(bpm)}`}>
      <div className="difficulty-scale__viewport">
        <div
          className="difficulty-scale__strip"
          style={{ transform: `translateX(${translateX}px)` }}
        >
          {ZONES.map((z) => (
            <div
              key={z.label}
              className="difficulty-scale__zone"
              style={{ width: `${z.width}px` }}
            >
              {z.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getCurrentZone(bpm: number): string {
  if (bpm <= 0) return '—'
  if (bpm <= 1) return 'Very difficult'
  if (bpm <= 2) return 'Difficult'
  if (bpm <= 4) return 'Moderate'
  return 'Easy'
}
