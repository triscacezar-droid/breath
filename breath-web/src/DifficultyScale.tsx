const ZONES = [
  { label: 'Very slow', width: 52 },
  { label: 'Slow', width: 36 },
  { label: 'Calming', width: 48 },
  { label: 'Normal', width: 52 },
  { label: 'Fast', width: 32 },
] as const

const BPM_MAX = 24
const VIEWPORT_HALF = 58
const MAX_POSITION = 196 + 32

/** BPM → strip position. Very slow <1.5, Slow 1.5–3, Calming 3–8, Normal 8–16, Fast 16+ */
function bpmToPosition(bpm: number): number {
  if (bpm <= 0) return 0
  if (bpm <= 1.5) return (bpm / 1.5) * 52
  if (bpm <= 3) return 56 + ((bpm - 1.5) / 1.5) * 36
  if (bpm <= 8) return 96 + ((bpm - 3) / 5) * 48
  if (bpm <= 16) return 144 + ((bpm - 8) / 8) * 52
  return 196 + Math.min((bpm - 16) / 4, 1) * 32
}

export function DifficultyScale({ bpm }: { bpm: number }) {
  const clampedBpm = Math.max(0, Math.min(BPM_MAX, bpm))
  const position = bpmToPosition(clampedBpm)
  const translateX = Math.max(
    VIEWPORT_HALF - MAX_POSITION,
    Math.min(VIEWPORT_HALF, VIEWPORT_HALF - position)
  )

  return (
    <div className="difficulty-scale" role="img" aria-label={`Pace: ${getCurrentZone(clampedBpm)}`}>
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
  if (bpm < 1.5) return 'Very slow'
  if (bpm < 3) return 'Slow'
  if (bpm < 8) return 'Calming'
  if (bpm < 16) return 'Normal'
  return 'Fast'
}
