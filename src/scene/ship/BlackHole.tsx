import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Group,
  type Mesh,
  type Points,
  ShaderMaterial,
} from 'three'
import { flight } from '../flight'
import { prefersReducedMotion } from '../pointer'
import { blackHole } from './blackHoleState'
import { SHIP } from './shipConfig'

const B = SHIP.blackHole
/** the accretion disk is a ring seen at an angle: its height is squashed by this */
const TILT = 0.3
const HALF = B.diskRadius * 1.25

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uReveal;
  uniform float uHalf;
  uniform float uShadow;
  uniform float uDisk;
  uniform float uTilt;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  void main() {
    vec2 p = (vUv - 0.5) * 2.0 * uHalf;   // world units, camera-facing
    float r = length(p);

    // accretion disk: a tilted ring, so measure radius in its own (un-squashed) plane
    vec2 q = vec2(p.x, p.y / uTilt);
    float rd = length(q);
    float ang = atan(q.y, q.x);
    float band = smoothstep(uShadow * 1.05, uShadow * 1.5, rd) * (1.0 - smoothstep(uShadow * 1.8, uDisk, rd));
    // differential rotation: inner material laps the outer (Keplerian ~ r^-1.5)
    float swirl = ang + uTime * 3.0 / pow(max(rd, 0.5) / uShadow, 1.5);
    float streaks = noise(vec2(swirl * 3.0, rd * 1.6)) * 0.6 + noise(vec2(swirl * 9.0, rd * 4.0)) * 0.4;
    // Doppler beaming: the side spinning toward us is brighter
    float beam = 1.0 + 0.65 * cos(ang);
    float heat = 1.0 - smoothstep(uShadow * 1.2, uDisk, rd);
    vec3 diskCol = mix(vec3(0.75, 0.22, 0.05), vec3(1.0, 0.85, 0.6), heat);
    float disk = band * (0.35 + 0.9 * streaks) * beam;

    // the far half of the disk passes behind the hole; the shadow covers it
    float shadow = 1.0 - smoothstep(uShadow * 0.92, uShadow, r);
    float front = step(0.0, -p.y);   // near half (below center) is drawn over the shadow
    disk *= mix(1.0 - shadow, 1.0, front);

    // photon ring: light orbiting just outside the shadow
    float ring = exp(-pow((r - uShadow * 1.06) / (uShadow * 0.07), 2.0)) * (0.9 + 0.3 * sin(ang * 2.0 + uTime));
    // faint lensed halo
    float halo = exp(-max(r - uShadow, 0.0) / (uShadow * 1.4)) * 0.25 * (1.0 - shadow);

    vec3 col = diskCol * disk + vec3(1.0, 0.9, 0.75) * ring + vec3(1.0, 0.6, 0.3) * halo;
    float glow = clamp(disk * 0.9 + ring + halo, 0.0, 1.0);
    float edge = 1.0 - smoothstep(uHalf * 0.8, uHalf, r);
    float alpha = max(shadow, glow) * uReveal * edge;
    // premultiplied: the shadow is opaque black, the light adds on top
    gl_FragColor = vec4(col * uReveal * edge, alpha);
  }
`

const DUST = 260

const dustVertex = /* glsl */ `
  uniform float uPixelRatio;
  attribute float aLife;
  varying float vLife;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vLife = aLife;
    gl_PointSize = clamp(260.0 / -mv.z, 1.0, 5.0) * uPixelRatio;
  }
`

const dustFragment = /* glsl */ `
  uniform float uReveal;
  varying float vLife;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float a = exp(-dot(c, c) * 4.0) * sin(vLife * 3.14159) * uReveal * 0.8;
    gl_FragColor = vec4(mix(vec3(1.0, 0.45, 0.15), vec3(1.0, 0.9, 0.7), vLife), a);
  }
`

/**
 * Visual for the black hole: a camera-facing disk shader (shadow, photon ring,
 * tilted accretion disk) plus dust spiralling in. Physics live in Ship.
 */
export function BlackHole() {
  const groupRef = useRef<Group>(null)
  const dustRef = useRef<Points<BufferGeometry, ShaderMaterial>>(null)
  const diskRef = useRef<Mesh<BufferGeometry, ShaderMaterial>>(null)
  const sim = useRef({ angle: new Float32Array(DUST), radius: new Float32Array(DUST) })

  const { material, dustGeometry, dustMaterial } = useMemo(() => {
    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uHalf: { value: HALF },
        uShadow: { value: B.shadowRadius },
        uDisk: { value: B.diskRadius },
        uTilt: { value: TILT },
      },
      transparent: true,
      depthWrite: false,
      premultipliedAlpha: true,
    })
    const dustGeometry = new BufferGeometry()
    dustGeometry.setAttribute('position', new BufferAttribute(new Float32Array(DUST * 3), 3))
    dustGeometry.setAttribute('aLife', new BufferAttribute(new Float32Array(DUST), 1))
    const dustMaterial = new ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      uniforms: { uPixelRatio: { value: 1 }, uReveal: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    return { material, dustGeometry, dustMaterial }
  }, [])

  useEffect(() => {
    const s = sim.current
    for (let i = 0; i < DUST; i++) {
      s.angle[i] = Math.random() * Math.PI * 2
      s.radius[i] = B.shadowRadius + Math.random() * (B.diskRadius * 1.3 - B.shadowRadius)
    }
    return () => {
      material.dispose()
      dustGeometry.dispose()
      dustMaterial.dispose()
    }
  }, [material, dustGeometry, dustMaterial])

  useFrame(({ camera, clock, gl }, delta) => {
    const group = groupRef.current
    const dust = dustRef.current
    const disk = diskRef.current
    if (!group || !dust || !disk) return
    const dt = Math.min(delta, 0.05)
    const reduced = prefersReducedMotion()
    const reveal = Math.min(1, flight.reveal)
    group.visible = reveal > 0.01
    // sit just behind the ship's flight plane, facing the camera
    group.position.set(blackHole.x, blackHole.y, SHIP.spawn.z - 1.5)
    group.quaternion.copy(camera.quaternion)
    disk.material.uniforms.uTime.value = clock.elapsedTime * (reduced ? 0.15 : 1)
    disk.material.uniforms.uReveal.value = reveal
    dust.material.uniforms.uReveal.value = reveal
    dust.material.uniforms.uPixelRatio.value = gl.getPixelRatio()

    // dust: Keplerian orbits (ω ∝ r^-1.5) with a slow inspiral; respawn at the rim
    const s = sim.current
    const pos = dust.geometry.getAttribute('position') as BufferAttribute
    const life = dust.geometry.getAttribute('aLife') as BufferAttribute
    const outer = B.diskRadius * 1.3
    const speed = reduced ? 0.15 : 1
    for (let i = 0; i < DUST; i++) {
      const r = s.radius[i]
      s.angle[i] += 9 * (B.shadowRadius / r) ** 1.5 * dt * speed
      s.radius[i] -= (0.6 + 2.4 * (B.shadowRadius / r) ** 2) * dt * speed
      if (s.radius[i] < B.shadowRadius) {
        s.radius[i] = outer * (0.8 + Math.random() * 0.2)
        s.angle[i] = Math.random() * Math.PI * 2
      }
      const x = Math.cos(s.angle[i]) * s.radius[i]
      const y = Math.sin(s.angle[i]) * s.radius[i] * TILT
      // the far half disappears behind the shadow
      const hidden = y > 0 && Math.hypot(x, y) < B.shadowRadius
      pos.setXYZ(i, x, y, hidden ? -1000 : 0.05)
      life.setX(i, (s.radius[i] - B.shadowRadius) / (outer - B.shadowRadius))
    }
    pos.needsUpdate = true
    life.needsUpdate = true
  })

  return (
    <group ref={groupRef}>
      <mesh ref={diskRef} material={material}>
        <planeGeometry args={[HALF * 2, HALF * 2]} />
      </mesh>
      <points ref={dustRef} geometry={dustGeometry} material={dustMaterial} frustumCulled={false} />
    </group>
  )
}
