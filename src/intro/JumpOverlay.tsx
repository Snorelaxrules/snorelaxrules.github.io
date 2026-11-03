import { useRef } from 'react'
import { useJumpFrame } from './useJumpFrame'

/** Screen-space effects layered over the cockpit: tunnel glow, vignette, white flash. */
export function JumpOverlay() {
  const glow = useRef<HTMLDivElement>(null)
  const vignette = useRef<HTMLDivElement>(null)
  const flash = useRef<HTMLDivElement>(null)

  useJumpFrame((s) => {
    if (glow.current) glow.current.style.opacity = String(s.warp * 0.9)
    if (vignette.current) vignette.current.style.opacity = String(Math.min(1, s.warp * 1.4))
    if (flash.current) flash.current.style.opacity = String(s.flash)
  })

  return (
    <div aria-hidden="true">
      <div ref={vignette} className="jump-fx jump-vignette" />
      <div ref={glow} className="jump-fx jump-glow" />
      <div ref={flash} className="jump-fx jump-flash" />
    </div>
  )
}
