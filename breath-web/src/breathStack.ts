/**
 * Breath stack: fills slots from bottom up by priority.
 * Slots: 0 = top, 1 = middle, 2 = bottom (center).
 */

export type StackItem = 'text' | 'dots' | 'sphere'

/** Priority order: first = bottom slot, last = top slot */
const PRIORITY: StackItem[] = ['sphere', 'dots', 'text']

export type BreathStack = readonly [StackItem | null, StackItem | null, StackItem | null]

export function buildBreathStack(visible: {
  text: boolean
  dots: boolean
  sphere: boolean
}): BreathStack {
  const items = PRIORITY.filter((item) =>
    item === 'text' ? visible.text : item === 'dots' ? visible.dots : visible.sphere
  )
  const slots: (StackItem | null)[] = [null, null, null]
  items.forEach((item, i) => {
    slots[2 - i] = item
  })
  return [slots[0], slots[1], slots[2]] as BreathStack
}

export function getSlotIndex(stack: BreathStack, item: StackItem): 0 | 1 | 2 | -1 {
  const i = stack.indexOf(item)
  return i >= 0 ? (i as 0 | 1 | 2) : -1
}

export function getTopForSlot(
  slotIndex: 0 | 1 | 2 | -1,
  slotTops: readonly [number, number, number],
  slot3Height: number,
  isSphere: boolean
): number {
  if (slotIndex < 0) return 0
  if (isSphere && slotIndex === 2) {
    return slotTops[2] - slot3Height / 2
  }
  return slotTops[slotIndex as 0 | 1 | 2]
}

export function isInStack(stack: BreathStack, item: StackItem): boolean {
  return stack.includes(item)
}

export function getSpacerClass(item: StackItem | null, slotIndex: 0 | 1 | 2): string {
  if (item === null) return ''
  if (slotIndex === 0) return 'breath-stack__spacer--top'
  if (slotIndex === 2 && item === 'sphere') return 'breath-stack__spacer--center'
  return 'breath-stack__spacer--middle'
}

export function isEntering(prev: BreathStack, next: BreathStack, item: StackItem): boolean {
  return !prev.includes(item) && next.includes(item)
}

/** Viewport-relative positions: slot 2 = center, slot 1 = 15vh above, slot 0 = 25vh above */
const GAP_ABOVE_SPHERE_VH = 15
const GAP_ABOVE_DOTS_VH = 10
const CENTER_VH = 50

/** Minimum pixel distance between slot centers (avoids overlap in horizontal/landscape) */
export const STACK_MIN_GAP_PX = 48
/** Sphere size from CSS clamp(120px, 48vmin, 280px); min gap above sphere = size/2 + 20px */
const CIRCLE_MIN_PX = 120
const CIRCLE_VMIN = 48
const CIRCLE_MAX_PX = 280
const GAP_ABOVE_SPHERE_PX = 20

function getSphereSizePx(viewportWidth: number, viewportHeight: number): number {
  const vminPx = (Math.min(viewportWidth, viewportHeight) / 100) * CIRCLE_VMIN
  return Math.max(CIRCLE_MIN_PX, Math.min(vminPx, CIRCLE_MAX_PX))
}

const SLOT_TOP_VH: Record<number, number> = {
  0: CENTER_VH - GAP_ABOVE_SPHERE_VH - GAP_ABOVE_DOTS_VH, // top: 25vh
  1: CENTER_VH - GAP_ABOVE_SPHERE_VH, // middle: 35vh
  2: CENTER_VH, // bottom/center: 50vh
}

/**
 * Returns the vertical center position (in vh) for viewport-relative stacking.
 * When viewport dimensions are provided, enforces min gaps; sphere gap = sphere size + 20px.
 */
export function getViewportTopVh(
  stack: BreathStack,
  item: StackItem,
  viewportHeightPx?: number,
  viewportWidthPx?: number
): number {
  const slot = getSlotIndex(stack, item)
  if (slot < 0) return CENTER_VH
  if (!viewportHeightPx || viewportHeightPx <= 0) return SLOT_TOP_VH[slot]
  const minGapVh = (STACK_MIN_GAP_PX * 100) / viewportHeightPx
  const sphereSize =
    viewportWidthPx && viewportWidthPx > 0
      ? getSphereSizePx(viewportWidthPx, viewportHeightPx) / 2 + GAP_ABOVE_SPHERE_PX
      : 160
  const minGapSphereVh = (sphereSize * 100) / viewportHeightPx
  const slot1 = Math.min(SLOT_TOP_VH[1], CENTER_VH - minGapSphereVh)
  const slot0 = Math.min(SLOT_TOP_VH[0], slot1 - minGapVh)
  if (slot === 2) return CENTER_VH
  if (slot === 1) return slot1
  return slot0
}
