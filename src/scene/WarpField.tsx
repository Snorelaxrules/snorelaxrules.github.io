import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  type Mesh,
  ShaderMaterial,
  Vector2,
} from 'three'
import { WARP_DEPTH, flight } from './flight'

/**
 * Local stars around the ship. Each star is an instanced quad built in screen
 * space as a capsule from its head to a tail trailing along -Z, so at rest it's a
 * soft dot and at warp the same geometry becomes a streak.
 */

const vertexShader = /* glsl */ `
  uniform float uTravel;
  uniform float uStretch;
  uniform float uDepth;
  uniform float uWarp;
  uniform float uDust;
  uniform vec2 uResolution;
  uniform float uPixelRatio;
  uniform float uSizeScale;

  attribute vec4 aStar;   // xy, z0, size
  attribute vec3 aColor;

  varying vec2 vLocal;    // x: across, y: along (both in radii)
  varying float vHalfLen; // half streak length in radii
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float z = mod(aStar.z + uTravel, uDepth) - uDepth;
    vec3 head = vec3(aStar.xy, min(z, -1.5));
    vec3 tail = head - vec3(0.0, 0.0, uStretch);

    vec4 h = projectionMatrix * modelViewMatrix * vec4(head, 1.0);
    if (h.w <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
    vec4 t = projectionMatrix * modelViewMatrix * vec4(tail, 1.0);

    vec2 halfRes = 0.5 * uResolution;
    vec2 hp = (h.xy / h.w) * halfRes;
    vec2 tp = (t.xy / max(t.w, 1e-3)) * halfRes;
    vec2 d = tp - hp;
    float len = min(length(d), uResolution.y * 0.75);
    vec2 dir = len > 1e-4 ? normalize(d) : vec2(0.0, 1.0);
    vec2 nrm = vec2(-dir.y, dir.x);

    float rRaw = aStar.w * uSizeScale / h.w;
    float r = clamp(rRaw, 1.1, 2.8) * uPixelRatio;
    float extent = 0.5 * len + r;

    vec2 p = hp + dir * (0.5 * len) + dir * position.y * extent + nrm * position.x * r;
    gl_Position = vec4(p / halfRes * h.w, h.z, h.w);

    vLocal = vec2(position.x, position.y * extent / r);
    vHalfLen = 0.5 * len / r;
    vColor = mix(aColor, vec3(0.75, 0.9, 1.0) * length(aColor), uWarp * 0.6);

    float fadeNear = 1.0 - smoothstep(-6.0, -1.6, z);
    float fadeFar = smoothstep(-uDepth, -uDepth * 0.65, z);
    float subPixel = clamp(rRaw / 1.1, 0.3, 1.0);
    // streaks get brighter and fatter-looking with warp
    // at rest this field is a faint layer of nearby dust; the sky dome carries the sky
    float presence = mix(uDust, 1.0, smoothstep(0.0, 0.15, uWarp));
    vAlpha = fadeNear * fadeFar * presence * mix(subPixel, 1.0, uWarp) * (1.0 + uWarp * 1.2);
  }
`

const fragmentShader = /* glsl */ `
  varying vec2 vLocal;
  varying float vHalfLen;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float dy = max(abs(vLocal.y) - vHalfLen, 0.0);
    float dist = length(vec2(vLocal.x, dy));
    float core = 1.0 - smoothstep(0.0, 1.0, dist);
    core = pow(core, 1.5);
    float s = clamp((vLocal.y + vHalfLen) / max(2.0 * vHalfLen, 1e-3), 0.0, 1.0);
    float tail = mix(1.0, 0.08, s * smoothstep(0.0, 2.0, vHalfLen));
    float a = core * tail * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor, a);
  }
`

const PALETTE = ['#e6eeff', '#cfe0ff', '#a9c8ff', '#9be6ff', '#ffe2bf']

function buildWarpField(count: number) {
  const geometry = new InstancedBufferGeometry()
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3),
  )
  geometry.setIndex([0, 1, 2, 0, 2, 3])

  const stars = new Float32Array(count * 4)
  const colors = new Float32Array(count * 3)
  const c = new Color()
  // Biased toward the travel axis: near-axis stars are the ones that sweep across
  // the whole screen as long streaks; outer ones give short streaks mid-screen.
  const radius = 130
  for (let i = 0; i < count; i++) {
    const r = 1.5 + Math.random() ** 1.6 * (radius - 1.5)
    const a = Math.random() * Math.PI * 2
    stars[i * 4] = Math.cos(a) * r
    stars[i * 4 + 1] = Math.sin(a) * r
    stars[i * 4 + 2] = Math.random() * WARP_DEPTH
    stars[i * 4 + 3] = 0.5 + Math.random() ** 3 * 1.4
    c.set(PALETTE[Math.random() < 0.08 ? 4 : Math.floor(Math.random() * 4)])
    const brightness = 0.55 + Math.random() * 0.45
    colors[i * 3] = c.r * brightness
    colors[i * 3 + 1] = c.g * brightness
    colors[i * 3 + 2] = c.b * brightness
  }
  geometry.setAttribute('aStar', new InstancedBufferAttribute(stars, 4))
  geometry.setAttribute('aColor', new InstancedBufferAttribute(colors, 3))
  geometry.instanceCount = count

  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTravel: { value: 0 },
      uStretch: { value: 0 },
      uDepth: { value: WARP_DEPTH },
      uWarp: { value: 0 },
      uDust: { value: 0 },
      uResolution: { value: new Vector2(1, 1) },
      uPixelRatio: { value: 1 },
      uSizeScale: { value: 170 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    // quads are built in screen space with a mirrored basis; don't cull them
    side: DoubleSide,
  })

  return { geometry, material }
}

export function WarpField({ count = 3500 }: { count?: number }) {
  const ref = useRef<Mesh<InstancedBufferGeometry, ShaderMaterial>>(null)
  const { geometry, material } = useMemo(() => buildWarpField(count), [count])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(({ gl }) => {
    if (!ref.current) return
    const u = ref.current.material.uniforms
    u.uTravel.value = flight.travel
    u.uStretch.value = flight.stretch
    u.uWarp.value = flight.warp
    u.uDust.value = flight.dust
    gl.getDrawingBufferSize(u.uResolution.value)
    u.uPixelRatio.value = gl.getPixelRatio()
  })

  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}
