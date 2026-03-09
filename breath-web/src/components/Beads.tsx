/**
 * 13 beads in a circle, main bead with tassel. Circle rotates so current bead is at top.
 * Triangle fixed at top, outside the circle. Advances one bead per cycle.
 */
const BEAD_COUNT = 13
const MAIN_BEAD_INDEX = 0

/** Triangle Y position (0 = top of viewBox). Adjust to move triangle higher/lower. */
const TRIANGLE_Y = -4

function getBeadIndex(cycleCount: number): number {
  const step = cycleCount % 25
  const raw = step <= 12 ? 12 - step : step - 12
  return raw === MAIN_BEAD_INDEX ? 1 : raw
}

function beadAngle(index: number): number {
  return (index * (360 / BEAD_COUNT) - 90) * (Math.PI / 180)
}

export function Beads({ cycleCount }: { cycleCount: number }) {
  const currentBead = getBeadIndex(cycleCount)
  const radius = 20
  const center = 30
  const rotationDeg = -currentBead * (360 / BEAD_COUNT)

  return (
    <span className="beads" aria-hidden>
      <svg viewBox="0 0 60 60" className="beads__svg">
        {/* Beads circle: rotate so current bead is at top */}
        <g
          className="beads__circle"
          style={{
            transform: `rotate(${rotationDeg}deg)`,
            transformOrigin: '50% 50%',
          }}
        >
          {Array.from({ length: BEAD_COUNT }, (_, i) => {
            const angle = beadAngle(i)
            const x = center + radius * Math.cos(angle)
            const y = center + radius * Math.sin(angle)
            const isMain = i === MAIN_BEAD_INDEX

            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={3}
                  className={`beads__bead ${isMain ? 'beads__bead--main' : ''} ${i === currentBead ? 'beads__bead--current' : ''}`}
                />
                {isMain && (() => {
                  const dx = x - center
                  const dy = y - center
                  const len = Math.hypot(dx, dy) || 1
                  const ux = dx / len
                  const uy = dy / len
                  const tasselLength = 9
                  const startX = x + ux * 3
                  const startY = y + uy * 3
                  const endX = x + ux * (3 + tasselLength)
                  const endY = y + uy * (3 + tasselLength)
                  const spread = 2.5
                  const leftDx = ux * tasselLength - uy * spread
                  const leftDy = uy * tasselLength + ux * spread
                  const leftLen = Math.hypot(leftDx, leftDy) || 1
                  const leftScale = tasselLength / leftLen
                  const rightDx = ux * tasselLength + uy * spread
                  const rightDy = uy * tasselLength - ux * spread
                  const rightLen = Math.hypot(rightDx, rightDy) || 1
                  const rightScale = tasselLength / rightLen
                  return (
                    <g className="beads__tassel">
                      <line x1={startX} y1={startY} x2={endX} y2={endY} />
                      <line x1={startX} y1={startY} x2={startX + leftDx * leftScale} y2={startY + leftDy * leftScale} />
                      <line x1={startX} y1={startY} x2={startX + rightDx * rightScale} y2={startY + rightDy * rightScale} />
                    </g>
                  )
                })()}
              </g>
            )
          })}
        </g>
        {/* Triangle at top, outside circle, pointing down */}
        <g transform={`translate(${center}, ${TRIANGLE_Y})`}>
          <polygon points="0,8 5,-4 -5,-4" className="beads__triangle" />
        </g>
      </svg>
    </span>
  )
}
