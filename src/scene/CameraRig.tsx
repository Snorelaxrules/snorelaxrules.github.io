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
    target: p.clone().add(new Vector3(c.size * RIG.dockAimOffset, 0, 0)),
    fov: RIG.dockFov,
  }
}

const copyPose = (out: Pose, p: Pose) => {
  out.pos.copy(p.pos)
  out.target.copy(p.target)
  out.fov = p.fov
  return out
}

const easeInOutCubic = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2)

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
    start: 0,
    duration: 0,
    arc: 0,
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

    // Start a flight when the active destination changes.
    const key = activeId ?? 'home'
    if (key !== r.key) {
      const to = poseFor(clusterById(activeId))
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
        r.arc = r.from.pos.distanceTo(r.to.pos) * 0.08
        setDocked(null)
      }
      r.key = key
      r.init = true
    }

    if (r.duration > 0) {
      const u = Math.min(1, (now - r.start) / r.duration)
      const e = easeInOutCubic(u)
      r.cur.pos.lerpVectors(r.from.pos, r.to.pos, e)
      r.cur.pos.y += Math.sin(Math.PI * u) * r.arc
      r.cur.target.lerpVectors(r.from.target, r.to.target, e)
      r.cur.fov = r.from.fov + (r.to.fov - r.from.fov) * e
      if (u >= 1) {
        r.duration = 0
        setDocked(activeId)
      }
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
