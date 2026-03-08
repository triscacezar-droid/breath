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
