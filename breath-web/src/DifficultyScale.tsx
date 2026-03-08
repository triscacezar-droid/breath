import { useTranslation } from 'react-i18next'

const ZONE_KEYS = ['verySlow', 'slow', 'calming', 'normal', 'fast'] as const
const ZONE_HEIGHTS = [21, 14, 19, 21, 13] as const
const ZONE_GAP = 8

const BPM_MAX = 30
const VIEWPORT_HEIGHT = 70
const VIEWPORT_HALF = VIEWPORT_HEIGHT / 2
const MAX_POSITION = 21 + ZONE_GAP + 14 + ZONE_GAP + 19 + ZONE_GAP + 21 + ZONE_GAP + 13

/** BPM → strip position (vertical). Very slow <1.5, Slow 1.5–3, Calming 3–8, Normal 8–12, Fast 12+ */
function bpmToPosition(bpm: number): number {
  if (bpm <= 0) return 0
  if (bpm <= 1.5) return (bpm / 1.5) * 21
  if (bpm <= 3) return 21 + ZONE_GAP + ((bpm - 1.5) / 1.5) * 14
  if (bpm <= 8) return 21 + ZONE_GAP + 14 + ZONE_GAP + ((bpm - 3) / 5) * 19
  if (bpm <= 12) return 21 + ZONE_GAP + 14 + ZONE_GAP + 19 + ZONE_GAP + ((bpm - 8) / 4) * 21
  return 21 + ZONE_GAP + 14 + ZONE_GAP + 19 + ZONE_GAP + 21 + ZONE_GAP + Math.min((bpm - 12) / (BPM_MAX - 12), 1) * 13
}

function getCurrentZoneKey(bpm: number): (typeof ZONE_KEYS)[number] | null {
  if (bpm <= 0) return null
  if (bpm < 1.5) return 'verySlow'
  if (bpm < 3) return 'slow'
  if (bpm < 8) return 'calming'
  if (bpm < 12) return 'normal'
  return 'fast'
}

export function DifficultyScale({ bpm }: { bpm: number }) {
  const { t } = useTranslation()
  const clampedBpm = Math.max(0, Math.min(BPM_MAX, bpm))
  const position = bpmToPosition(clampedBpm)
  const translateY = Math.max(
    VIEWPORT_HALF - MAX_POSITION,
    Math.min(VIEWPORT_HALF, VIEWPORT_HALF - position)
  )
  const currentZoneKey = getCurrentZoneKey(clampedBpm)
  const zones = ZONE_KEYS.map((key, i) => ({ key, height: ZONE_HEIGHTS[i], label: t(`pace.${key}`) }))

  return (
    <div
      className="difficulty-scale difficulty-scale--vertical"
      role="img"
      aria-label={currentZoneKey ? t('settings.pace') + ': ' + t(`pace.${currentZoneKey}`) : '—'}
    >
      <div className="difficulty-scale__viewport">
        <div
          className="difficulty-scale__strip"
          style={{ transform: `translateY(${translateY}px)` }}
        >
          {zones.map((z, i) => (
            <div
              key={z.key}
              className="difficulty-scale__zone"
              style={{
                height: `${z.height}px`,
                marginBottom: i < zones.length - 1 ? ZONE_GAP : 0,
              }}
            >
              {z.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
