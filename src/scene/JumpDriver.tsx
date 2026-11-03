import { useFrame } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { ARRIVED_SAMPLE, IDLE_SAMPLE, JUMP, jitter, sampleJump } from '../intro/timeline'
import { useIntro } from '../state/introStore'
import { WARP_DEPTH, flight } from './flight'

/** Samples the jump timeline each frame and drives camera + shared flight state. */
export function JumpDriver() {
  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera
    const { phase, startedAt, mode } = useIntro.getState()
    const s =
      phase === 'jumping'
        ? sampleJump((performance.now() - startedAt) / 1000, mode)
        : phase === 'cockpit'
          ? IDLE_SAMPLE
          : ARRIVED_SAMPLE

    const dt = Math.min(delta, 1 / 20)
    flight.speed = s.speed
    flight.warp = s.warp
    flight.dust = s.dust
    flight.stretch = s.speed * JUMP.streakPerSpeed
    flight.travel = (flight.travel + s.speed * dt) % WARP_DEPTH

    if (camera.fov !== s.fov) {
      camera.fov = s.fov
      camera.updateProjectionMatrix()
    }

    const shake = s.shake * 0.004
    camera.rotation.set(jitter(s.t, 1) * shake, jitter(s.t, 2) * shake, jitter(s.t, 3) * shake * 0.5)
  })

  return null
}
