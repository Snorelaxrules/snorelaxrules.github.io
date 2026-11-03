import { useRef } from 'react'
import { useIntro } from '../state/introStore'
import { CockpitFrame } from './CockpitFrame'
import { CockpitInstruments } from './CockpitInstruments'
import { jitter } from './timeline'
import { useJumpFrame } from './useJumpFrame'

export function Cockpit() {
  const rootRef = useRef<HTMLDivElement>(null)
  const jumping = useIntro((s) => s.phase === 'jumping')

  useJumpFrame((s) => {
    const el = rootRef.current
    if (!el) return
    el.style.opacity = String(s.cockpitOpacity)
    const amp = s.shake * 2.5
    el.style.transform =
      amp > 0.01 ? `translate3d(${(jitter(s.t, 4) * amp).toFixed(2)}px, ${(jitter(s.t, 5) * amp).toFixed(2)}px, 0)` : ''
  })

  return (
    <div ref={rootRef} className={`cockpit${jumping ? ' is-jumping' : ''}`}>
      <CockpitFrame />
      <CockpitInstruments />
    </div>
  )
}
