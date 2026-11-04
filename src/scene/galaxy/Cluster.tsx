import { Html } from '@react-three/drei'
import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Mesh,
  type Points,
  ShaderMaterial,
} from 'three'
import type { ClusterConfig } from '../../content/clusters'
import { goTo, useGalaxy } from '../../state/galaxyStore'
import { flight } from '../flight'
import { damp, prefersReducedMotion } from '../pointer'
import { generateCluster } from './generate'
import { clusterFragment, clusterVertex, glowFragment, glowVertex } from './shaders'

const DEG = Math.PI / 180

function buildPoints(cfg: ClusterConfig) {
  const { positions, colors, sizes, radii } = generateCluster(cfg)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aColor', new BufferAttribute(colors, 3))
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1))
  geometry.setAttribute('aRadius', new BufferAttribute(radii, 1))
  const material = new ShaderMaterial({
    vertexShader: clusterVertex,
    fragmentShader: clusterFragment,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uScale: { value: 150 },
      uHover: { value: 0 },
      uReveal: { value: 0 },
      uPulse: { value: cfg.kind === 'beacon' ? 1 : 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  return { geometry, material }
}

function buildGlow(cfg: ClusterConfig) {
  return new ShaderMaterial({
    vertexShader: glowVertex,
    fragmentShader: glowFragment,
    uniforms: {
      uColor: { value: new Color(cfg.kind === 'spiral' ? (cfg.coreColor ?? cfg.color) : cfg.color) },
      uOpacity: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

export function Cluster({ cfg, interactive }: { cfg: ClusterConfig; interactive: boolean }) {
  const pointsRef = useRef<Points<BufferGeometry, ShaderMaterial>>(null)
  const glowRef = useRef<Mesh<BufferGeometry, ShaderMaterial>>(null)
  const anim = useRef({ hover: 0, reveal: 0 })
  const { geometry, material } = useMemo(() => buildPoints(cfg), [cfg])
  const glowMaterial = useMemo(() => buildGlow(cfg), [cfg])
  // mouse hover and ship proximity highlight the same way
  const highlighted = useGalaxy((s) => s.hovered === cfg.id || s.proximity === cfg.id)
  const labelsVisible = useGalaxy((s) => s.activeId === null)
  const setHovered = useGalaxy((s) => s.setHovered)

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
      glowMaterial.dispose()
    },
    [geometry, material, glowMaterial],
  )

  useFrame(({ gl, camera, clock }, delta) => {
    const points = pointsRef.current
    const glow = glowRef.current
    if (!points || !glow) return
    const a = anim.current
    const dt = Math.min(delta, 0.05)
    const g = useGalaxy.getState()
    a.hover = damp(a.hover, g.hovered === cfg.id || g.proximity === cfg.id ? 1 : 0, 8, dt)
    a.reveal = damp(a.reveal, flight.reveal, 5, dt)

    const u = points.material.uniforms
    u.uTime.value = clock.elapsedTime
    u.uPixelRatio.value = gl.getPixelRatio()
    u.uHover.value = a.hover
    u.uReveal.value = a.reveal
    const reduced = prefersReducedMotion()
    if (!reduced) points.rotation.y += (cfg.spin ?? 1) * DEG * dt
    u.uPulse.value = cfg.kind === 'beacon' && !reduced ? 1 : 0
    points.visible = a.reveal > 0.002

    glow.quaternion.copy(camera.quaternion)
    glow.material.uniforms.uOpacity.value = a.reveal * (0.55 + a.hover * 0.5)
    glow.visible = points.visible
  })

  const [tx, tz] = cfg.tilt ?? [0, 0]
  const glowSize = cfg.size * (cfg.kind === 'spiral' ? 1.1 : 1.6)

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(cfg.id)
  }
  const onOut = () => {
    if (useGalaxy.getState().hovered === cfg.id) setHovered(null)
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    // a drag that started on a cluster pans the view; it isn't a click
    if (e.delta > 5) return
    goTo(cfg.route)
  }

  return (
    <group position={cfg.position}>
      <group rotation={[tx * DEG, 0, tz * DEG]}>
        <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
      </group>
      <mesh ref={glowRef} material={glowMaterial} scale={glowSize}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {interactive && (
        <mesh onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
          <sphereGeometry args={[cfg.size * 0.85, 16, 12]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </mesh>
      )}
      {interactive && (
        <Html position={[0, -cfg.size - 2.5, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`cluster-label${highlighted && labelsVisible ? ' is-visible' : ''}`}>
            <span className="cluster-label-name">{cfg.label}</span>
            <span className="cluster-label-sub">{cfg.subtitle}</span>
          </div>
        </Html>
      )}
    </group>
  )
}
