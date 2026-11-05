import { useEffect, useRef } from 'react'
import { damp, pointer, prefersReducedMotion } from '../scene/pointer'
import { useIntro } from '../state/introStore'
import { cockpitConfig } from './cockpit.config'
import { CockpitFrame } from './CockpitFrame'
import { CockpitInstruments } from './CockpitInstruments'
import { Stacker } from './stacker/Stacker'
import { IDLE_SAMPLE, jitter, sampleJump } from './timeline'

/** How far the cockpit shifts against the pointer (px) — the stars stay put, which reads as depth. */
const HEAD_PARALLAX = { x: 16, y: 9 }

export function Cockpit() {
  const rootRef = useRef<HTMLDivElement>(null)
  const jumping = useIntro((s) => s.phase === 'jumping')

  useEffect(() => {
    const loop = { raf: 0, last: performance.now(), x: 0, y: 0 }
    const tick = (now: number) => {
      const el = rootRef.current
      const dt = Math.min((now - loop.last) / 1000, 0.05)
      loop.last = now
      const reduced = prefersReducedMotion()
      loop.x = damp(loop.x, reduced ? 0 : pointer.x, 3, dt)
      loop.y = damp(loop.y, reduced ? 0 : pointer.y, 3, dt)

      const { phase, startedAt, mode } = useIntro.getState()
      const s = phase === 'jumping' ? sampleJump((performance.now() - startedAt) / 1000, mode) : IDLE_SAMPLE
      if (el) {
        const amp = s.shake * 2.5
        const tx = -loop.x * HEAD_PARALLAX.x + jitter(s.t, 4) * amp
        const ty = loop.y * HEAD_PARALLAX.y + jitter(s.t, 5) * amp
        // slight overscan so the edges never reveal the scene behind
        el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(1.03)`
        el.style.opacity = String(s.cockpitOpacity)
      }
      loop.raf = requestAnimationFrame(tick)
    }
    loop.raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(loop.raf)
  }, [])

  return (
    <div ref={rootRef} className={`cockpit${jumping ? ' is-jumping' : ''}`}>
      <CockpitFrame />
      <CockpitInstruments />
      {cockpitConfig.game && <Stacker />}
    </div>
  )
}
