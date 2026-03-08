import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getViewportTopVh, isEntering, type BreathStack } from '../breathStack'

export function useBreathStackLayout(stack: BreathStack, contentVisible: boolean) {
  const stackRef = useRef<HTMLDivElement>(null)
  const slot1Ref = useRef<HTMLDivElement>(null)
  const slot2Ref = useRef<HTMLDivElement>(null)
  const slot3Ref = useRef<HTMLDivElement>(null)
  const prevMeasuredRef = useRef<BreathStack>([null, null, null])
  const isZoomSnapRef = useRef(false)

  const [slotTops, setSlotTops] = useState<[number, number, number]>([0, 0, 0])
  const [enteringText, setEnteringText] = useState(false)
  const [enteringDots, setEnteringDots] = useState(false)

  const measureSlots = useCallback((snap = false) => {
    const stackEl = stackRef.current
    const s1 = slot1Ref.current
    const s2 = slot2Ref.current
    const s3 = slot3Ref.current
    if (!stackEl || !s1 || !s2 || !s3) return
    if (snap) isZoomSnapRef.current = true
    const stackRect = stackEl.getBoundingClientRect()
    const getTop = (el: HTMLElement) => el.getBoundingClientRect().top - stackRect.top
    setSlotTops([getTop(s1), getTop(s2), getTop(s3)])
  }, [])

  useLayoutEffect(() => {
    measureSlots()
    const prev = prevMeasuredRef.current
    setEnteringText(isEntering(prev, stack, 'text'))
    setEnteringDots(isEntering(prev, stack, 'dots'))
    prevMeasuredRef.current = stack
  }, [stack, contentVisible, measureSlots])

  useEffect(() => {
    const el = stackRef.current
    if (!el) return
    const ro = new ResizeObserver(() => measureSlots(true))
    ro.observe(el)
    const onResize = () => measureSlots(true)
    window.visualViewport?.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('scroll', onResize)
    return () => {
      ro.disconnect()
      window.visualViewport?.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('scroll', onResize)
    }
  }, [measureSlots])

  useLayoutEffect(() => {
    if (isZoomSnapRef.current) isZoomSnapRef.current = false
  }, [slotTops])

  const textTopVh = getViewportTopVh(stack, 'text')
  const dotsTopVh = getViewportTopVh(stack, 'dots')

  return {
    stackRef,
    slot1Ref,
    slot2Ref,
    slot3Ref,
    enteringText,
    setEnteringText,
    enteringDots,
    setEnteringDots,
    textTopVh,
    dotsTopVh,
    isZoomSnapRef,
  }
}
