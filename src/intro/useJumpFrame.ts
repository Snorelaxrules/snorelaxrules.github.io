import { useEffect, useLayoutEffect, useRef } from 'react'
import { useIntro } from '../state/introStore'
import { sampleJump, type JumpSample } from './timeline'

/**
 * Runs `cb` every animation frame while the jump is in progress, writing styles
 * directly (no React re-render per frame). Ends the jump when the timeline completes.
 */
export function useJumpFrame(cb: (s: JumpSample) => void) {
  const phase = useIntro((s) => s.phase)
  const cbRef = useRef(cb)
  useLayoutEffect(() => {
    cbRef.current = cb
  })

  useEffect(() => {
    if (phase !== 'jumping') return
    const loop = { raf: 0 }
    const tick = () => {
      const { startedAt, mode, finish } = useIntro.getState()
      const s = sampleJump((performance.now() - startedAt) / 1000, mode)
      cbRef.current(s)
      if (s.done) {
        finish()
        return
      }
      loop.raf = requestAnimationFrame(tick)
    }
    loop.raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(loop.raf)
  }, [phase])
}
