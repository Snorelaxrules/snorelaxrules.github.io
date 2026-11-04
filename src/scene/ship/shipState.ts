import { Vector3 } from 'three'
import { type ClusterConfig, clusterById } from '../../content/clusters'
import { useGalaxy } from '../../state/galaxyStore'
import { SHIP } from './shipConfig'

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
}

/** Movement keys currently held. */
export const keys = new Set<Direction>()

export const rangeOf = (c: ClusterConfig) => SHIP.proximity.base + c.size * SHIP.proximity.perSize

/** Park the ship just outside a cluster's range, on the side facing the spawn point. */
function parkNear(c: ClusterConfig) {
  const [cx, cy] = c.position
  let dx = SHIP.spawn.x - cx
  let dy = SHIP.spawn.y - cy
  const len = Math.hypot(dx, dy)
  if (len < 1e-3) {
    dx = 0
    dy = -1
  } else {
    dx /= len
    dy /= len
  }
  const d = rangeOf(c) + SHIP.returnGap
  ship.pos.set(cx + dx * d, cy + dy * d, SHIP.spawn.z)
  ship.vel.set(0, 0, 0)
  ship.heading = Math.atan2(dy, dx)
  ship.bank = 0
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
    ship.flying = 0
    ship.idle = 0
    useGalaxy.getState().setHintVisible(true)
  }
  previous = s.activeId
})
