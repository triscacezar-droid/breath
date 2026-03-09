import type { Phase, LabelVariant, ProgressVariant, CenterVariant, TimingMode, BreathMode, FooterDisplayMode } from '../types'
import type { BreathStack } from '../breathStack'
import { CENTER_VH } from '../breathStack'
import { getSpacerClass } from '../breathStack'
import { getPhaseLabelDisplay } from '../utils'
import { PhaseDots } from './PhaseDots'
import { Beads } from './Beads'
import { CenterAum } from './CenterAum'

export interface BreathSessionProps {
  stack: BreathStack
  stackRef: React.RefObject<HTMLDivElement>
  slot1Ref: React.RefObject<HTMLDivElement>
  slot2Ref: React.RefObject<HTMLDivElement>
  slot3Ref: React.RefObject<HTMLDivElement>
  phase: Phase
  prevPhase: Phase
  labelAnimating: boolean
  labelVariant: LabelVariant
  scale: number
  sphereAnulomLeft: number
  breathMode: BreathMode
  durations: Record<Phase, number>
  phaseStartTimeRef: React.MutableRefObject<number>
  progressVariant: ProgressVariant
  timingMode: TimingMode
  cycleCount: number
  contentVisible: boolean
  displayTextVisible: boolean
  displayDotsVisible: boolean
  displaySphereVisible: boolean
  stackTextVisible: boolean
  stackDotsVisible: boolean
  stackSphereVisible: boolean
  showFloatingText: boolean
  showFloatingDots: boolean
  enteringText: boolean
  enteringDots: boolean
  setEnteringText: (v: boolean) => void
  setEnteringDots: (v: boolean) => void
  textTopVh: number
  dotsTopVh: number
  isZoomSnapRef: React.MutableRefObject<boolean>
  centerVariant: CenterVariant
  footerVisible: boolean
  footerShouldShow: boolean
  displayCyclesVisible: boolean
  footerDisplayMode: FooterDisplayMode
  elapsedSeconds: number
  othersOnline: number | null
  showOnTap: boolean
  t: (key: string, opts?: { count?: number }) => string
  formatElapsedSeconds: (s: number) => string
}

export function BreathSession({
  stack,
  stackRef,
  slot1Ref,
  slot2Ref,
  slot3Ref,
  phase,
  prevPhase,
  labelAnimating,
  labelVariant,
  scale,
  sphereAnulomLeft,
  breathMode,
  durations,
  phaseStartTimeRef,
  progressVariant,
  timingMode,
  cycleCount,
  contentVisible,
  displayTextVisible,
  displayDotsVisible,
  displaySphereVisible,
  stackTextVisible,
  stackDotsVisible,
  stackSphereVisible,
  showFloatingText,
  showFloatingDots,
  enteringText,
  enteringDots,
  setEnteringText,
  setEnteringDots,
  textTopVh,
  dotsTopVh,
  isZoomSnapRef,
  centerVariant,
  footerVisible,
  footerShouldShow,
  displayCyclesVisible,
  footerDisplayMode,
  elapsedSeconds,
  othersOnline,
  showOnTap,
  t,
  formatElapsedSeconds,
}: BreathSessionProps) {
  return (
    <>
      <section className="session" aria-label={t('settings.sessionAria')}>
        <div
          ref={stackRef}
          className="breath-stack"
          aria-hidden={!contentVisible || (!stackTextVisible && !stackDotsVisible && !stackSphereVisible)}
        >
          <div ref={slot1Ref} className="breath-stack__slot">
            {stack[0] != null && (
              <div className={`breath-stack__spacer ${getSpacerClass(stack[0], 0)}`} aria-hidden />
            )}
          </div>
          <div ref={slot2Ref} className="breath-stack__slot">
            {stack[1] != null && (
              <div className={`breath-stack__spacer ${getSpacerClass(stack[1], 1)}`} aria-hidden />
            )}
          </div>
          <div ref={slot3Ref} className="breath-stack__slot breath-stack__slot--center">
            {stack[2] != null && (
              <div className={`breath-stack__spacer ${getSpacerClass(stack[2], 2)}`} aria-hidden />
            )}
          </div>
          <div className="breath-stack__floating" />
        </div>
        <div
          className="breath-stack__floating-viewport"
          aria-hidden={!contentVisible || (!stackTextVisible && !stackDotsVisible)}
        >
          {showFloatingText && (
            <div
              className={`breath-stack__float-item breath-stack__float-item--viewport ${enteringText ? 'breath-stack__float-item--entering' : ''}`}
              style={{
                top: textTopVh === 50 ? '50%' : `${textTopVh}vh`,
                transition: isZoomSnapRef.current ? 'none' : 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onAnimationEnd={() => enteringText && setEnteringText(false)}
            >
              <div className={`status ${contentVisible && displayTextVisible ? 'status--visible' : 'status--hidden'}`}>
                <div className={`phase-stack phase-stack--${labelVariant} ${labelAnimating && (phase === 'EXHALE' || phase === 'HOLD_BOTTOM') ? 'phase-stack--exhaling' : ''}`}>
                  {labelAnimating ? (
                    <>
                      <div className="phase-row phase-out" key="out">{getPhaseLabelDisplay(prevPhase, labelVariant)}</div>
                      <div className="phase-row phase-in" key="in">{getPhaseLabelDisplay(phase, labelVariant)}</div>
                    </>
                  ) : (
                    <div className="phase-row">{getPhaseLabelDisplay(phase, labelVariant)}</div>
                  )}
                </div>
              </div>
            </div>
          )}
          {showFloatingDots && (
            <div
              className={`breath-stack__float-item breath-stack__float-item--viewport ${enteringDots ? 'breath-stack__float-item--entering' : ''}`}
              style={{
                top: dotsTopVh === CENTER_VH ? '50%' : `${dotsTopVh}vh`,
                transition: isZoomSnapRef.current ? 'none' : 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onAnimationEnd={() => enteringDots && setEnteringDots(false)}
            >
              <div className={`phase-dots-wrap ${contentVisible && displayDotsVisible ? 'phase-dots-wrap--visible' : 'phase-dots-wrap--hidden'}`}>
                <PhaseDots phase={phase} duration={durations[phase]} phaseStartTimeRef={phaseStartTimeRef} progressVariant={progressVariant} timingMode={timingMode} durations={durations} breathMode={breathMode} cycleCount={cycleCount} />
              </div>
            </div>
          )}
        </div>
        {stack[2] === 'sphere' && centerVariant === 'aum' && (
          <div
            className={`center-aum ${contentVisible && displaySphereVisible ? 'center-aum--visible' : 'center-aum--hidden'}`}
            aria-hidden
          >
            <CenterAum />
          </div>
        )}
        {stack[2] === 'sphere' && centerVariant !== 'aum' && (
          <div
            className={`circle circle--viewport-center ${centerVariant === 'ring' ? 'circle--ring' : ''} ${contentVisible && displaySphereVisible ? 'circle--visible' : 'circle--hidden'}`}
            data-phase={phase}
            style={{
              transform: `translate(-50%, -50%) scale(${scale})`,
              ...(breathMode === 'anulom_vilom' && { left: `${sphereAnulomLeft}%` }),
            }}
            aria-hidden
          />
        )}
      </section>
      <footer className={`cycles-footer ${footerVisible ? 'cycles-footer--visible' : 'cycles-footer--hidden'}`} aria-hidden={!footerShouldShow}>
        {footerVisible && (
          <span className={`cycles-footer__cycles ${displayCyclesVisible ? 'cycles-footer__cycles--visible' : 'cycles-footer__cycles--hidden'}`}>
            {footerDisplayMode === 'cycles' && t('footer.cyclesCompleted', { count: cycleCount })}
            {footerDisplayMode === 'time' && formatElapsedSeconds(elapsedSeconds)}
            {footerDisplayMode === 'beads' && <Beads cycleCount={cycleCount} />}
          </span>
        )}
        {othersOnline !== null && (
          <span className={`cycles-footer__presence ${showOnTap ? 'cycles-footer__presence--visible' : 'cycles-footer__presence--hidden'}`}>
            {othersOnline === 0 ? t('footer.noOneElse') : t('footer.othersBreathing', { count: othersOnline })}
          </span>
        )}
      </footer>
    </>
  )
}
