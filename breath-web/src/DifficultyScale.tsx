import { useTranslation } from 'react-i18next'

const ZONE_KEYS = ['verySlow', 'slow', 'calming', 'normal', 'fast'] as const
const ZONE_WIDTHS = [52, 36, 48, 52, 32] as const

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

function getCurrentZoneKey(bpm: number): (typeof ZONE_KEYS)[number] | null {
  if (bpm <= 0) return null
  if (bpm < 1.5) return 'verySlow'
  if (bpm < 3) return 'slow'
  if (bpm < 8) return 'calming'
  if (bpm < 16) return 'normal'
  return 'fast'
}

export function DifficultyScale({ bpm }: { bpm: number }) {
  const { t } = useTranslation()
  const clampedBpm = Math.max(0, Math.min(BPM_MAX, bpm))
  const position = bpmToPosition(clampedBpm)
  const translateX = Math.max(
    VIEWPORT_HALF - MAX_POSITION,
    Math.min(VIEWPORT_HALF, VIEWPORT_HALF - position)
  )
  const currentZoneKey = getCurrentZoneKey(clampedBpm)
  const zones = ZONE_KEYS.map((key, i) => ({ key, width: ZONE_WIDTHS[i], label: t(`pace.${key}`) }))

  return (
    <div
      className="difficulty-scale"
      role="img"
      aria-label={currentZoneKey ? t('settings.pace') + ': ' + t(`pace.${currentZoneKey}`) : '—'}
    >
      <div className="difficulty-scale__viewport">
        <div
          className="difficulty-scale__strip"
          style={{ transform: `translateX(${translateX}px)` }}
        >
          {zones.map((z) => (
            <div
              key={z.key}
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
