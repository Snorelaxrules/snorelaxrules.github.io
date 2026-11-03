import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, type Group, ShaderMaterial, Vector3 } from 'three'
import { flight } from './flight'

/**
 * Faint background nebulae: a handful of large camera-centered billboards with
 * fbm-noise falloff. Procedural, no textures.
 */

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uSeed;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float fall = 1.0 - smoothstep(0.2, 1.0, length(p));
    float n = fbm(p * 2.4 + uSeed);
    float wisps = fbm(p * 5.0 - uSeed * 1.7);
    float a = fall * fall * smoothstep(0.38, 0.85, n) * (0.55 + 0.45 * wisps) * uOpacity;
    gl_FragColor = vec4(uColor, a);
  }
`

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const CLOUDS = [
  { dir: [-0.6, 0.35, -1], size: 1300, color: '#1d3b8a', opacity: 0.32, seed: 1.3 },
  { dir: [0.8, -0.2, -1], size: 1100, color: '#0f5a6e', opacity: 0.28, seed: 4.1 },
  { dir: [0.1, 0.6, -1], size: 900, color: '#3a2a78', opacity: 0.22, seed: 7.7 },
  { dir: [-0.9, -0.5, -0.6], size: 1000, color: '#14406a', opacity: 0.25, seed: 2.2 },
  { dir: [0.4, 0.1, 1], size: 1200, color: '#1b2f6e', opacity: 0.25, seed: 9.4 },
  { dir: [0.9, 0.5, -0.2], size: 800, color: '#5a3a2a', opacity: 0.12, seed: 5.5 },
] as const

const RADIUS = 1300

export function Nebula() {
  const ref = useRef<Group>(null)
  const items = useMemo(
    () =>
      CLOUDS.map((c) => ({
        position: new Vector3(...c.dir).normalize().multiplyScalar(RADIUS),
        size: c.size,
        opacity: c.opacity,
        material: new ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            uColor: { value: new Color(c.color) },
            uSeed: { value: c.seed },
            uOpacity: { value: c.opacity },
          },
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      })),
    [],
  )

  useEffect(() => () => items.forEach((i) => i.material.dispose()), [items])

  useFrame(({ camera }) => {
    const group = ref.current
    if (!group) return
    group.position.copy(camera.position)
    const dim = 1 - flight.warp * 0.9
    group.children.forEach((child, i) => {
      const mat = (child as unknown as { material: ShaderMaterial }).material
      mat.uniforms.uOpacity.value = items[i].opacity * dim
    })
  })

  return (
    <group ref={ref}>
      {items.map((item) => (
        <mesh
          key={item.material.uuid}
          position={item.position}
          material={item.material}
          scale={item.size}
          onUpdate={(m) => m.lookAt(0, 0, 0)}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  )
}
