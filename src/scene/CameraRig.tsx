import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { type PerspectiveCamera, Vector3 } from 'three'
import { type ClusterConfig, clusterById } from '../content/clusters'
import { jitter } from '../intro/timeline'
import { useGalaxy } from '../state/galaxyStore'
import { useIntro } from '../state/introStore'
import { flight } from './flight'
import { damp, pointer, prefersReducedMotion } from './pointer'
import { RIG, heading } from './rig'
import { SHIP } from './ship/shipConfig'
import { pan, ship } from './ship/shipState'

interface Pose {
  pos: Vector3
  target: Vector3
  fov: number
}

const DOCK_DIR = new Vector3(0, 0.32, 1).normalize()

function poseFor(c: ClusterConfig | null): Pose {
  if (!c) return { pos: RIG.home.pos.clone(), target: RIG.home.target.clone(), fov: RIG.home.fov }
  const p = new Vector3(...c.position)
  return {
    pos: p.clone().addScaledVector(DOCK_DIR, c.size * RIG.dockDistance),
    target: p,
    fov: RIG.dockFov,
  }
}

const copyPose = (out: Pose, p: Pose) => {
  out.pos.copy(p.pos)
  out.target.copy(p.target)
  out.fov = p.fov
  return out
}

/** Home view panned to follow the ship (offset from its spawn point). */
function followPose(out: Pose) {
  const fx = (ship.pos.x - SHIP.spawn.x) * SHIP.camera.follow
  const fy = (ship.pos.y - SHIP.spawn.y) * SHIP.camera.follow
  // add the dragged offset, keeping the view center inside the map; write the
  // clamp back so dragging past the edge doesn't build up a dead zone
  const { maxX, minY, maxY } = SHIP.camera.pan
  const homeY = RIG.home.target.y
  const dx = Math.max(-maxX, Math.min(maxX, fx + pan.x))
  const dy = Math.max(minY - homeY, Math.min(maxY - homeY, fy + pan.y))
  pan.x = dx - fx
  pan.y = dy - fy
  out.pos.set(RIG.home.pos.x + dx, RIG.home.pos.y + dy, RIG.home.pos.z)
  out.target.set(RIG.home.target.x + dx, RIG.home.target.y + dy, RIG.home.target.z)
  out.fov = RIG.home.fov
  return out
}

const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2)
/** dive in: gentle start, accelerating into the core, short settle */
const easeDive = (u: number) => (u < 0.85 ? 0.92 * (u / 0.85) ** 2.2 : 0.92 + 0.08 * (1 - (1 - (u - 0.85) / 0.15) ** 2))

/**
 * Owns the camera: intro approach + shake, idle drift, mouse parallax, and
 * flights between the home view and docked cluster views.
 */
export function CameraRig() {
  const rig = useRef({
    key: '',
    init: false,
    from: poseFor(null),
    to: poseFor(null),
    cur: poseFor(null),
    /** lagged ship-follow pose; this is "home" once the ship exists */
    follow: poseFor(null),
    desired: poseFor(null),
    start: 0,
    duration: 0,
    arc: 0,
    diving: false,
    drift: 0,
    px: 0,
    py: 0,
    pos: new Vector3(),
    dir: new Vector3(),
  })

  useFrame((state, delta) => {
    const r = rig.current
    const dt = Math.min(delta, 0.05)
    const now = state.clock.elapsedTime
    const cam = state.camera as PerspectiveCamera
    const { activeId, setDocked } = useGalaxy.getState()
    const phase = useIntro.getState().phase
    const reduced = prefersReducedMotion()

    // Home follows the ship with a gentle lag.
    followPose(r.desired)
    if (!r.init) copyPose(r.follow, r.desired)
    else {
      const k = 1 - Math.exp(-(reduced ? SHIP.camera.lagReduced : SHIP.camera.lag) * dt)
      r.follow.pos.lerp(r.desired.pos, k)
      r.follow.target.lerp(r.desired.target, k)
    }

    // Start a flight when the active destination changes.
    const key = activeId ?? 'home'
    if (key !== r.key) {
      const to = activeId ? poseFor(clusterById(activeId)) : r.follow
      if (!r.init || reduced) {
        // first frame (deep link) or reduced motion: no flight
        copyPose(r.cur, to)
        r.duration = 0
        setDocked(activeId)
      } else {
        copyPose(r.from, r.cur)
        copyPose(r.to, to)
        r.start = now
        r.duration = activeId ? RIG.flyIn : RIG.flyOut
        r.arc = activeId ? 0 : r.from.pos.distanceTo(r.to.pos) * 0.06
        r.diving = !!activeId
        setDocked(null)
      }
      r.key = key
      r.init = true
    }

    if (r.duration > 0) {
      // flying home: land on the (possibly moving) follow pose
      if (!activeId) copyPose(r.to, r.follow)
      const u = Math.min(1, (now - r.start) / r.duration)
      const e = r.diving ? easeDive(u) : easeInOutCubic(u)
      // aim swings onto the cluster quickly, position follows
      const aim = r.diving ? easeInOutCubic(Math.min(1, u * 1.6)) : e
      r.cur.pos.lerpVectors(r.from.pos, r.to.pos, e)
      r.cur.pos.y += Math.sin(Math.PI * u) * r.arc
      r.cur.target.lerpVectors(r.from.target, r.to.target, aim)
      r.cur.fov = r.from.fov + (r.to.fov - r.from.fov) * e
      if (r.diving && u >= RIG.pageRevealAt) setDocked(activeId)
      if (u >= 1) {
        r.duration = 0
        setDocked(activeId)
      }
    } else if (!activeId) {
      copyPose(r.cur, r.follow)
    }

    // Compose: base pose, intro approach, drift, parallax, shake.
    const pos = r.pos.copy(r.cur.pos)
    let fov = r.cur.fov
    if (phase !== 'arrived') {
      r.dir.subVectors(r.cur.target, r.cur.pos).normalize()
      pos.addScaledVector(r.dir, -flight.approach * RIG.approachDistance)
      fov = flight.fov
    }

    const driftTarget =
      reduced || phase !== 'arrived' ? 0 : activeId ? RIG.drift.docked : RIG.drift.home
    r.drift = damp(r.drift, driftTarget, 1.5, dt)
    r.px = damp(r.px, pointer.x, 2.5, dt)
    r.py = damp(r.py, pointer.y, 2.5, dt)
    pos.x += (Math.sin(now * 0.07) * 3 + r.px * RIG.parallax.x) * r.drift
    pos.y += (Math.sin(now * 0.05 + 1) * 1.6 + r.py * RIG.parallax.y) * r.drift
    pos.z += Math.cos(now * 0.06) * 2.5 * r.drift

    cam.position.copy(pos)
    cam.lookAt(r.cur.target)
    heading.copy(cam.quaternion)

    if (flight.shake > 0) {
      const s = flight.shake * 0.004
      cam.rotateX(jitter(flight.t, 1) * s)
      cam.rotateY(jitter(flight.t, 2) * s)
      cam.rotateZ(jitter(flight.t, 3) * s * 0.5)
    }

    if (cam.fov !== fov) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
  })

  return null
}
