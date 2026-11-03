import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Points,
  ShaderMaterial,
  Vector3,
} from 'three'
import { flight } from './flight'

/**
 * Distant background stars at "infinity": a sphere that follows the camera, with
 * a faint galactic band. Dims while in hyperspace.
 */

const vertexShader = /* glsl */ `
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uTwinkle;
  uniform float uDim;
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    float tw = 1.0 + uTwinkle * 0.3 * sin(uTime * (0.4 + aPhase * 1.6) + aPhase * 40.0);
    gl_PointSize = aSize * uPixelRatio;
    vColor = aColor;
    vAlpha = uDim * tw;
  }
`

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float a = exp(-dot(c, c) * 4.0) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
  }
`

const RADIUS = 1500

function buildSky(count: number) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)
  const c = new Color()
  const v = new Vector3()
  // Galactic band: a tilted great circle.
  const bandNormal = new Vector3(0.35, 1, -0.2).normalize()

  for (let i = 0; i < count; i++) {
    const inBand = Math.random() < 0.45
    do {
      v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
    } while (v.lengthSq() > 1 || v.lengthSq() < 1e-4)
    v.normalize()
    if (inBand) {
      // pull toward the band plane with a gaussian-ish falloff
      const off = v.dot(bandNormal)
      const spread = (Math.random() + Math.random() + Math.random() - 1.5) * 0.12
      v.addScaledVector(bandNormal, -off + spread).normalize()
    }
    v.multiplyScalar(RADIUS)
    positions.set([v.x, v.y, v.z], i * 3)

    const roll = Math.random()
    c.set(roll < 0.07 ? '#ffd9b0' : roll < 0.25 ? '#a9c8ff' : '#e3ebff')
    const b = 0.32 + Math.random() ** 2 * 0.68
    colors.set([c.r * b, c.g * b, c.b * b], i * 3)
    sizes[i] = 1.2 + Math.random() ** 6 * 3.2
    phases[i] = Math.random()
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1))

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uPixelRatio: { value: 1 },
      uTime: { value: 0 },
      uTwinkle: { value: 1 },
      uDim: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  return { geometry, material }
}

export function SkyDome({ count = 5500 }: { count?: number }) {
  const ref = useRef<Points<BufferGeometry, ShaderMaterial>>(null)
  const twinkle = useRef(1)
  const { geometry, material } = useMemo(() => buildSky(count), [count])

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      twinkle.current = reduce.matches ? 0 : 1
    }
    apply()
    reduce.addEventListener('change', apply)
    return () => {
      reduce.removeEventListener('change', apply)
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  useFrame(({ gl, camera, clock }) => {
    const points = ref.current
    if (!points) return
    points.position.copy(camera.position)
    const u = points.material.uniforms
    u.uTwinkle.value = twinkle.current
    u.uTime.value = clock.elapsedTime
    u.uPixelRatio.value = gl.getPixelRatio()
    u.uDim.value = 1 - flight.warp * 0.85
  })

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}
