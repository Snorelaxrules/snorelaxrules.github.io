import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  type Mesh,
  MeshBasicMaterial,
  type Points,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { atmosphereFragment, cloudFragment, sphereVertex, surfaceFragment } from '../../sections/about/planet/shaders'
import { useGalaxy } from '../../state/galaxyStore'
import { useIntro } from '../../state/introStore'
import { flight } from '../flight'
import { damp, prefersReducedMotion } from '../pointer'
import { BlackHole } from '../ship/BlackHole'
import { SHIP } from '../ship/shipConfig'
import { ship } from '../ship/shipState'
import { COURSE, PALETTES, type PlanetSpec } from './courseConfig'
import { predictPath } from './coursePhysics'
import { course, exitCourse, formatTime, respawn, toggleTrajectory, useCourse } from './courseState'
import { dotsFragment, dotsVertex, quadVertex, softGlowFragment, starFragment, wormholeFragment } from './shaders'

const Z = SHIP.spawn.z
const LIGHT = new Vector3(-0.6, 0.45, 0.65).normalize()
/** the course group renders only while the camera is within this x-distance of the zone */
const NEAR = 120

const COLORS = {
  future: new Color('#7ae0ff'),
  next: new Color('#ffb36b'),
  passed: new Color('#5fe3a0'),
  gate: new Color('#ffb36b'),
}

/** Planet look from config: the About page's surface/cloud/atmosphere shaders, one set per planet. */
function planetMaterials(p: PlanetSpec) {
  const c = PALETTES[p.palette]
  const col = (hex: string) => ({ value: new Color(hex) })
  return {
    surface: new ShaderMaterial({
      vertexShader: sphereVertex,
      fragmentShader: surfaceFragment,
      uniforms: {
        uLight: { value: LIGHT },
        uSeed: { value: p.seed },
        uSea: { value: p.seaLevel },
        uDeep: col(c.deepOcean),
        uOcean: col(c.ocean),
        uShallows: col(c.shallows),
        uLand: col(c.land),
        uHigh: col(c.highlands),
        uIce: col(c.ice),
        uAtmo: col(c.atmosphere),
        uCity: col(c.cityLights),
      },
    }),
    clouds: new ShaderMaterial({
      vertexShader: sphereVertex,
      fragmentShader: cloudFragment,
      uniforms: { uLight: { value: LIGHT }, uColor: col(c.clouds), uSeed: { value: p.seed }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
    }),
    atmosphere: new ShaderMaterial({
      vertexShader: sphereVertex,
      fragmentShader: atmosphereFragment,
      uniforms: { uLight: { value: LIGHT }, uColor: col(c.atmosphere) },
      transparent: true,
      depthWrite: false,
      side: BackSide,
      blending: AdditiveBlending,
    }),
  }
}

function Planets({ sphere }: { sphere: SphereGeometry }) {
  const refs = useRef<(Group | null)[]>([])
  const cloudRefs = useRef<(Mesh<BufferGeometry, ShaderMaterial> | null)[]>([])
  const mats = useMemo(() => COURSE.planets.map(planetMaterials), [])
  useEffect(
    () => () => {
      for (const m of mats) {
        m.surface.dispose()
        m.clouds.dispose()
        m.atmosphere.dispose()
      }
    },
    [mats],
  )
  useFrame(({ clock }, delta) => {
    const spin = Math.min(delta, 0.05) * (prefersReducedMotion() ? 0.03 : 0.12)
    refs.current.forEach((g) => {
      if (g) g.rotation.y += spin
    })
    for (const c of cloudRefs.current) if (c) c.material.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <>
      {COURSE.planets.map((p, i) => (
        <group key={`${p.x},${p.y}`} position={[p.x, p.y, Z]} scale={p.radius}>
          <group rotation={[0.35, 0, 0.3]} ref={(g) => void (refs.current[i] = g)}>
            <mesh geometry={sphere} material={mats[i].surface} />
            <mesh ref={(m) => void (cloudRefs.current[i] = m as Mesh<BufferGeometry, ShaderMaterial> | null)} geometry={sphere} material={mats[i].clouds} scale={1.015} />
          </group>
          <mesh geometry={sphere} material={mats[i].atmosphere} scale={1.13} />
        </group>
      ))}
    </>
  )
}

/** Checkpoint rings and the start gate: one shared torus, a material each. */
function Rings() {
  const torus = useMemo(() => new TorusGeometry(1, 0.06, 10, 72), [])
  const mats = useMemo(
    () =>
      [COURSE.gate, ...COURSE.rings].map(
        () => new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
      ),
    [],
  )
  const refs = useRef<(Mesh<BufferGeometry, MeshBasicMaterial> | null)[]>([])
  useEffect(
    () => () => {
      torus.dispose()
      for (const m of mats) m.dispose()
    },
    [torus, mats],
  )
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const reduced = prefersReducedMotion()
    const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 5)
    const racing = course.status !== 'idle'
    refs.current.forEach((mesh, i) => {
      if (!mesh) return
      const m = mesh.material
      if (i === 0) {
        // gate: warm and breathing until the race starts
        m.color.copy(COLORS.gate)
        m.opacity = racing ? 0.25 : 0.55 + 0.35 * pulse
        mesh.scale.setScalar(COURSE.gate.radius * (racing || reduced ? 1 : 1 + 0.04 * pulse))
        return
      }
      const idx = i - 1
      const r = COURSE.rings[idx]
      const isNext = racing && idx === course.next
      const passed = racing && idx < course.next
      m.color.copy(passed ? COLORS.passed : isNext ? COLORS.next : COLORS.future)
      m.opacity = passed ? 0.35 : isNext ? 0.6 + 0.4 * pulse : 0.28
      mesh.scale.setScalar(r.radius * (isNext && !reduced ? 1 + 0.08 * pulse : 1))
    })
  })
  return (
    <>
      {[COURSE.gate, ...COURSE.rings].map((r, i) => (
        <mesh
          key={`${r.x},${r.y}`}
          ref={(m) => void (refs.current[i] = m as Mesh<BufferGeometry, MeshBasicMaterial> | null)}
          geometry={torus}
          material={mats[i]}
          position={[r.x, r.y, Z]}
          scale={r.radius}
        />
      ))}
    </>
  )
}

function Wormhole() {
  const ref = useRef<Mesh<BufferGeometry, ShaderMaterial>>(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: quadVertex,
        fragmentShader: wormholeFragment,
        uniforms: { uTime: { value: 0 }, uActive: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  const w = COURSE.wormhole
  useFrame(({ clock, camera }, delta) => {
    const mesh = ref.current
    if (!mesh) return
    mesh.quaternion.copy(camera.quaternion)
    const open = course.status === 'racing' && course.next >= COURSE.rings.length
    const u = mesh.material.uniforms
    u.uActive.value = damp(u.uActive.value, open || course.status === 'finishing' ? 1 : 0, 3, Math.min(delta, 0.05))
    u.uTime.value = clock.elapsedTime * (prefersReducedMotion() ? 0.2 : 1)
  })
  return (
    <mesh ref={ref} material={material} position={[w.x, w.y, Z - 0.5]}>
      <planeGeometry args={[w.radius * 3.2, w.radius * 3.2]} />
    </mesh>
  )
}

/** Dotted path the ship would follow under gravity alone. */
function Trajectory() {
  const N = COURSE.trajectory.points
  const ref = useRef<Points<BufferGeometry, ShaderMaterial>>(null)
  const xy = useMemo(() => new Float32Array(N * 2), [N])
  const { geometry, material } = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3))
    geometry.setAttribute('aT', new BufferAttribute(Float32Array.from({ length: N }, (_, i) => i / (N - 1)), 1))
    const material = new ShaderMaterial({
      vertexShader: dotsVertex,
      fragmentShader: dotsFragment,
      uniforms: { uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    return { geometry, material }
  }, [N])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  useFrame(({ gl }) => {
    const pts = ref.current
    if (!pts) return
    const show = course.inZone && course.trajectory && (course.status === 'idle' || course.status === 'racing')
    pts.visible = show
    if (!show) return
    const n = predictPath(xy, N, COURSE.trajectory.seconds)
    const pos = pts.geometry.getAttribute('position') as BufferAttribute
    for (let i = 0; i < n; i++) pos.setXYZ(i, xy[i * 2], xy[i * 2 + 1], Z)
    pos.needsUpdate = true
    pts.geometry.setDrawRange(0, n)
    pts.material.uniforms.uPixelRatio.value = gl.getPixelRatio()
  })
  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />
}

/** Additive camera-facing quad with a given fragment shader. */
function GlowQuad({
  fragment,
  position,
  size,
  uniforms,
}: {
  fragment: string
  position: [number, number, number]
  size: number
  uniforms: Record<string, { value: unknown }>
}) {
  const ref = useRef<Mesh<BufferGeometry, ShaderMaterial>>(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: quadVertex,
        fragmentShader: fragment,
        uniforms: { ...uniforms, uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    // uniforms are static config
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fragment],
  )
  useEffect(() => () => material.dispose(), [material])
  useFrame(({ camera, clock }) => {
    const mesh = ref.current
    if (!mesh) return
    // hidden during the intro jump
    mesh.visible = flight.reveal > 0.5
    mesh.quaternion.copy(camera.quaternion)
    mesh.material.uniforms.uTime.value = clock.elapsedTime
  })
  return (
    <mesh ref={ref} material={material} position={position}>
      <planeGeometry args={[size, size]} />
    </mesh>
  )
}

/** A floating label that fades in as the ship approaches (x, y). */
function ProximityTag({
  x,
  y,
  near,
  far,
  className,
  dimInCourse = 1,
  children,
}: {
  x: number
  y: number
  near: number
  far: number
  className: string
  dimInCourse?: number
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useFrame(() => {
    const el = ref.current
    if (!el) return
    const d = Math.hypot(ship.pos.x - x, ship.pos.y - y)
    const u = 1 - Math.min(1, Math.max(0, (d - near) / (far - near)))
    const o = (u * (course.inZone ? dimInCourse : 1) * (flight.reveal > 0.5 ? 1 : 0)).toFixed(2)
    if (el.style.opacity !== o) el.style.opacity = o
  })
  return (
    <Html position={[x, y, Z]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={ref} className={className} style={{ opacity: 0 }}>
        {children}
      </div>
    </Html>
  )
}

/** Label over the gate: "Start", or the best time once there is one. */
function useCourseStatusLabel() {
  const best = useCourse((s) => s.best)
  return best === null ? 'Start' : `Start · best ${formatTime(best)}`
}

/** Keys while in the course: R respawn, T trajectory, Esc leave. */
function useCourseKeys() {
  // dev only: `document.dispatchEvent(new Event('course:finish-line'))` puts the
  // ship next to an open wormhole, for testing the ending
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const onDebug = () => {
      course.status = 'racing'
      course.next = COURSE.rings.length
      const w = COURSE.wormhole
      ship.pos.x = w.x + 14
      ship.pos.y = w.y + 2
      ship.vel.set(-18, -1, 0)
    }
    document.addEventListener('course:finish-line', onDebug)
    return () => document.removeEventListener('course:finish-line', onDebug)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      const ui = useCourse.getState()
      if (!ui.inCourse || ui.secretOpen) return
      if (useIntro.getState().phase !== 'arrived' || useGalaxy.getState().activeId !== null) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.code === 'KeyR') respawn()
      else if (e.code === 'KeyT') toggleTrajectory()
      else if (e.key === 'Escape') {
        e.preventDefault()
        exitCourse()
      } else return
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/**
 * The hidden slingshot course to the right of the galaxy. Hints (horizon glow,
 * sign, found marker) are always present; the course itself only renders when
 * the camera is near it.
 */
export function Course() {
  const groupRef = useRef<Group>(null)
  const found = useCourse((s) => s.found)
  const gateLabel = useCourseStatusLabel()
  // labels mount once the intro is over (and stay hidden until the scene is revealed)
  const arrived = useIntro((s) => s.phase === 'arrived')
  const sphere = useMemo(() => new SphereGeometry(1, 48, 32), [])
  useEffect(() => () => sphere.dispose(), [sphere])
  useCourseKeys()

  useFrame(({ camera }) => {
    const g = groupRef.current
    if (g) g.visible = camera.position.x > COURSE.zone.x0 - NEAR && flight.reveal > 0.01
  })

  const S = COURSE.sign
  const G = COURSE.gate
  const H = COURSE.horizonGlow
  const M = COURSE.foundMarker
  return (
    <>
      <GlowQuad
        fragment={softGlowFragment}
        position={[H.x, H.y, H.z]}
        size={H.size}
        uniforms={{ uColor: { value: new Color('#ff9a4d') }, uOpacity: { value: H.opacity } }}
      />
      {arrived && (
        <>
          <ProximityTag x={G.x} y={G.y + G.radius + 3} near={20} far={45} className="course-tag">
            {gateLabel}
          </ProximityTag>
          <ProximityTag x={S.x} y={S.y} near={S.fadeNear} far={S.fadeFar} className="course-sign" dimInCourse={0.35}>
            <span className="course-sign-text">{S.text}</span>
            <span className="course-sign-arrow" aria-hidden="true">
              →
            </span>
          </ProximityTag>
        </>
      )}
      {found && (
        <GlowQuad fragment={starFragment} position={[M.x, M.y, Z]} size={5} uniforms={{ uColor: { value: new Color('#ffcd5e') } }} />
      )}
      <group ref={groupRef} visible={false}>
        <Planets sphere={sphere} />
        {COURSE.blackHoles.map((b) => (
          <BlackHole key={`${b.x},${b.y}`} x={b.x} y={b.y} shadowRadius={b.shadowRadius} diskRadius={b.diskRadius} dust={COURSE.dustPerHole} />
        ))}
        <Rings />
        <Wormhole />
        <Trajectory />
      </group>
    </>
  )
}
