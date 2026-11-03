import { useFrame } from '@react-three/fiber'
import { ARRIVED_SAMPLE, IDLE_SAMPLE, JUMP, sampleJump } from '../intro/timeline'
import { useIntro } from '../state/introStore'
import { WARP_DEPTH, flight } from './flight'

/** Samples the intro timeline each frame into the shared flight state. */
export function JumpDriver() {
  useFrame((_, delta) => {
    const { phase, startedAt, mode } = useIntro.getState()
    const s =
      phase === 'jumping'
        ? sampleJump((performance.now() - startedAt) / 1000, mode)
        : phase === 'cockpit'
          ? IDLE_SAMPLE
          : ARRIVED_SAMPLE

    const dt = Math.min(delta, 1 / 20)
    flight.t = s.t
    flight.speed = s.speed
    flight.warp = s.warp
    flight.dust = s.dust
    flight.stretch = s.speed * JUMP.streakPerSpeed
    flight.travel = (flight.travel + s.speed * dt) % WARP_DEPTH
    flight.fov = s.fov
    flight.shake = s.shake
    flight.reveal = s.reveal
    flight.approach = s.approach
  })

  return null
}
