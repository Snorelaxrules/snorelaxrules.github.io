import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Points, ShaderMaterial } from 'three'
import { flight } from '../flight'
import { prefersReducedMotion } from '../pointer'
import { SHIP } from './shipConfig'
import { ENGINE_OFFSET } from './ShipModel'
import { ship } from './shipState'

const vertexShader = /* glsl */ `
  uniform float uPixelRatio;
  attribute float aAge;
  varying float vAge;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vAge = aAge;
    float size = 420.0 * mix(1.0, 0.25, aAge) / max(-mv.z, 0.1);
    gl_PointSize = aAge >= 1.0 ? 0.0 : clamp(size, 1.0, 16.0) * uPixelRatio;
  }
`

const fragmentShader = /* glsl */ `
  varying float vAge;
  void main() {
    if (vAge >= 1.0) discard;
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float a = exp(-dot(c, c) * 4.0) * (1.0 - vAge);
    vec3 hot = vec3(1.0, 0.95, 0.85);
    vec3 warm = vec3(1.0, 0.6, 0.25);
    vec3 cool = vec3(0.45, 0.8, 1.0);
    vec3 col = mix(mix(hot, warm, smoothstep(0.0, 0.4, vAge)), cool, smoothstep(0.45, 1.0, vAge));
    gl_FragColor = vec4(col, a);
  }
`

/** Thruster exhaust: a ring buffer of world-space particles left behind the engine. */
export function ShipTrail() {
  const ref = useRef<Points<BufferGeometry, ShaderMaterial>>(null)
  const n = SHIP.trail.maxParticles
  const sim = useRef({ vel: new Float32Array(n * 3), next: 0, carry: 0 })

  const { geometry, material } = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3))
    geometry.setAttribute('aAge', new BufferAttribute(new Float32Array(n).fill(1), 1))
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    return { geometry, material }
  }, [n])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(({ gl }, delta) => {
    const points = ref.current
    if (!points) return
    const dt = Math.min(delta, 0.05)
    const s = sim.current
    const posAttr = points.geometry.getAttribute('position') as BufferAttribute
    const ageAttr = points.geometry.getAttribute('aAge') as BufferAttribute
    const pos = posAttr.array as Float32Array
    const age = ageAttr.array as Float32Array
    const reduced = prefersReducedMotion()
    const scale = reduced ? SHIP.trail.reducedScale : 1
    const life = SHIP.trail.life * (reduced ? 0.5 : 1)

    // age and drift existing particles
    const drag = Math.exp(-3 * dt)
    for (let i = 0; i < n; i++) {
      if (age[i] >= 1) continue
      age[i] = Math.min(1, age[i] + dt / life)
      pos[i * 3] += s.vel[i * 3] * dt
      pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt
      pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt
      s.vel[i * 3] *= drag
      s.vel[i * 3 + 1] *= drag
      s.vel[i * 3 + 2] *= drag
    }

    // emit from the engine, faster when thrusting
    if (flight.reveal > 0.5 && ship.swallowed < 0) {
      s.carry += (SHIP.trail.rateIdle + ship.throttle * SHIP.trail.rateThrust) * scale * dt
      const fx = Math.cos(ship.heading)
      const fy = Math.sin(ship.heading)
      const ex = ship.pos.x + fx * ENGINE_OFFSET * SHIP.scale
      const ey = ship.pos.y + fy * ENGINE_OFFSET * SHIP.scale
      const eject = 3 + ship.throttle * 5
      while (s.carry >= 1) {
        s.carry -= 1
        const i = s.next
        s.next = (s.next + 1) % n
        const j = Math.random()
        // spread emission along this frame's travel so fast flight leaves no gaps
        pos[i * 3] = ex - ship.vel.x * dt * j + (Math.random() - 0.5) * 0.25
        pos[i * 3 + 1] = ey - ship.vel.y * dt * j + (Math.random() - 0.5) * 0.25
        pos[i * 3 + 2] = ship.pos.z + (Math.random() - 0.5) * 0.15
        s.vel[i * 3] = -fx * eject + (Math.random() - 0.5) * 1.5
        s.vel[i * 3 + 1] = -fy * eject + (Math.random() - 0.5) * 1.5
        s.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5
        age[i] = 0
      }
    }

    posAttr.needsUpdate = true
    ageAttr.needsUpdate = true
    points.material.uniforms.uPixelRatio.value = gl.getPixelRatio()
  })

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}
