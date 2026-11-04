import { Vector3 } from 'three'
import { type ClusterConfig, clusterById } from '../../content/clusters'
import { useGalaxy } from '../../state/galaxyStore'
import { blackHole } from './blackHoleState'
import { SHIP, rangeOf } from './shipConfig'

export type Direction = 'up' | 'down' | 'left' | 'right'

/** Mutable per-frame ship state (never React state). */
export const ship = {
  pos: SHIP.spawn.clone(),
  vel: new Vector3(),
  /** radians; 0 = nose pointing +x, π/2 = up */
  heading: Math.PI / 2,
  bank: 0,
  /** 0..1 engine output, smoothed */
  throttle: 0,
  /** seconds of input since the hint was last shown */
  flying: 0,
  /** seconds since the last input */
  idle: 0,
  /** seconds since being swallowed by the black hole; -1 when free */
  swallowed: -1,
  /** extra spin while swallowed (radians) */
  spin: 0,
  /** direction of travel when swallowed; we're spat out along it */
  entryX: 0,
  entryY: 1,
}

/** Manual view offset from dragging the background (scene units, added to the ship-follow camera). */
export const pan = { x: 0, y: 0, dragging: false }

/** Movement keys currently held. */
export const keys = new Set<Direction>()

/**
 * Park the ship just outside a cluster's range, preferably on the side facing
 * the spawn point, but never within the black hole's reach.
 */
function parkNear(c: ClusterConfig) {
  const [cx, cy] = c.position
  const len = Math.hypot(SHIP.spawn.x - cx, SHIP.spawn.y - cy)
  const base = len < 1e-3 ? -Math.PI / 2 : Math.atan2(SHIP.spawn.y - cy, SHIP.spawn.x - cx)
  const d = rangeOf(c) + SHIP.returnGap
  let dx = Math.cos(base)
  let dy = Math.sin(base)
  for (const turn of [0, 1, -1, 2, -2, 3]) {
    const a = base + (turn * Math.PI) / 3
    const x = cx + Math.cos(a) * d
    const y = cy + Math.sin(a) * d
    const safe = !blackHole.active || Math.hypot(x - blackHole.x, y - blackHole.y) > SHIP.blackHole.influence + 2
    if (safe) {
      dx = Math.cos(a)
      dy = Math.sin(a)
      break
    }
  }
  ship.pos.set(cx + dx * d, cy + dy * d, SHIP.spawn.z)
  ship.vel.set(0, 0, 0)
  ship.heading = Math.atan2(dy, dx)
  ship.bank = 0
  ship.swallowed = -1
  ship.spin = 0
}

// Leaving a section: restore the ship near the cluster we just left, drop held
// keys, and show the controls hint again. Runs synchronously on the store
// change, before the camera computes where to fly back to.
let previous = useGalaxy.getState().activeId
useGalaxy.subscribe((s) => {
  if (s.activeId === previous) return
  keys.clear()
  const left = clusterById(previous)
  if (left && s.activeId === null) {
    parkNear(left)
    pan.x = 0
    pan.y = 0
    ship.flying = 0
    ship.idle = 0
    useGalaxy.getState().setHintVisible(true)
  }
  previous = s.activeId
})
