import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { useGalaxy } from '../state/galaxyStore'

const WINDOW_SEC = 2
/** below ~45 fps averaged over a window, step resolution down */
const SLOW_FRAME_SEC = 1 / 45
const STEPS = [2, 1.5, 1.25, 1]

/**
 * Keeps the scene smooth on weaker GPUs: steps the pixel ratio down when frames
 * run slow (never back up mid-session, to avoid oscillating), and renders at 1×
 * while a page covers the scene — it's blurred behind the page anyway.
 */
export function AdaptiveDpr() {
  const setDpr = useThree((s) => s.setDpr)
  const state = useRef({ cap: Math.min(window.devicePixelRatio || 1, 2), sum: 0, frames: 0, current: 0 })

  useFrame((_, delta) => {
    const s = state.current
    // ignore stalls (tab switches, GC) rather than treating them as slowness
    if (delta < 0.25) {
      s.sum += delta
      s.frames++
    }
    if (s.sum >= WINDOW_SEC) {
      if (s.sum / s.frames > SLOW_FRAME_SEC) {
        const next = STEPS.find((d) => d < s.cap)
        if (next) s.cap = next
      }
      s.sum = 0
      s.frames = 0
    }
    const pageOpen = useGalaxy.getState().docked !== null
    const target = pageOpen ? 1 : s.cap
    if (target !== s.current) {
      s.current = target
      setDpr(target)
    }
  })

  return null
}
