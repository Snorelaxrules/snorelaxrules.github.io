import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  type Mesh,
  Quaternion,
  ShaderMaterial,
} from 'three'
import { glowFragment, glowVertex } from '../galaxy/shaders'
import { ship } from './shipState'

/**
 * Procedural low-poly ship. Local space: nose along +x, dorsal side +z (faces
 * the camera), wings along ±y; about 3.2 units long before SHIP.scale.
 *
 * To swap in a model or sprite, replace this component's contents. Keep the
 * same orientation and put the engine at ENGINE_OFFSET (ShipTrail emits from there).
 */
export const ENGINE_OFFSET = -1.05

const V = {
  nose: [2, 0, 0],
  left: [-1.2, 1.5, -0.05],
  right: [-1.2, -1.5, -0.05],
  tail: [-0.9, 0, 0],
  top: [-0.2, 0, 0.5],
  bottom: [-0.2, 0, -0.3],
} as const

const FACES: (keyof typeof V)[][] = [
  ['nose', 'left', 'top'],
  ['nose', 'top', 'right'],
  ['left', 'tail', 'top'],
  ['top', 'tail', 'right'],
  ['nose', 'bottom', 'left'],
  ['nose', 'right', 'bottom'],
  ['left', 'bottom', 'tail'],
  ['bottom', 'right', 'tail'],
]

function buildHull() {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(FACES.flat().flatMap((k) => V[k]), 3))
  geometry.computeVertexNormals()
  return geometry
}

const _q = new Quaternion()

export function ShipModel() {
  const glowRef = useRef<Mesh<BufferGeometry, ShaderMaterial>>(null)
  const { hull, edges, glow } = useMemo(() => {
    const hull = buildHull()
    return {
      hull,
      edges: new EdgesGeometry(hull),
      glow: new ShaderMaterial({
        vertexShader: glowVertex,
        fragmentShader: glowFragment,
        uniforms: { uColor: { value: new Color('#ffb36b') }, uOpacity: { value: 0.5 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    }
  }, [])

  useEffect(
    () => () => {
      hull.dispose()
      edges.dispose()
      glow.dispose()
    },
    [hull, edges, glow],
  )

  useFrame(({ camera }) => {
    const g = glowRef.current
    if (!g?.parent) return
    // billboard: cancel the parent's rotation, then face the camera
    g.parent.getWorldQuaternion(_q).invert()
    g.quaternion.copy(_q).multiply(camera.quaternion)
    g.scale.setScalar(1.3 + ship.throttle * 1.8)
    g.material.uniforms.uOpacity.value = 0.45 + ship.throttle * 0.7
  })

  return (
    <group>
      <mesh geometry={hull}>
        <meshStandardMaterial color="#22345a" metalness={0.55} roughness={0.35} flatShading side={DoubleSide} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#7ae0ff" transparent opacity={0.55} />
      </lineSegments>
      {/* canopy */}
      <mesh position={[0.55, 0, 0.2]} scale={[0.42, 0.2, 0.12]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color="#0b2733" emissive="#7ae0ff" emissiveIntensity={1.4} />
      </mesh>
      {/* wingtip running lights */}
      <mesh position={[-1.15, 1.45, 0]}>
        <sphereGeometry args={[0.07, 6, 4]} />
        <meshBasicMaterial color="#7ae0ff" />
      </mesh>
      <mesh position={[-1.15, -1.45, 0]}>
        <sphereGeometry args={[0.07, 6, 4]} />
        <meshBasicMaterial color="#ffb36b" />
      </mesh>
      {/* engine */}
      <mesh position={[ENGINE_OFFSET + 0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.26, 0.25, 8]} />
        <meshStandardMaterial color="#111a2e" emissive="#ffb36b" emissiveIntensity={0.6} />
      </mesh>
      <mesh ref={glowRef} position={[ENGINE_OFFSET, 0, 0]} material={glow}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  )
}
