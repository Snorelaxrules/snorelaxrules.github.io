import { Canvas } from '@react-three/fiber'
import { useGalaxy } from '../state/galaxyStore'
import { JUMP } from '../intro/timeline'
import { AdaptiveDpr } from './AdaptiveDpr'
import { CameraRig } from './CameraRig'
import { Course } from './course/Course'
import { Galaxies } from './galaxy/Galaxies'
import { JumpDriver } from './JumpDriver'
import { Nebula } from './Nebula'
import { Ship } from './ship/Ship'
import { ViewPan } from './ViewPan'
import { SkyDome } from './SkyDome'
import { WarpField } from './WarpField'

const PAUSING_SECTIONS = new Set(['about', 'map'])

/** The one persistent WebGL canvas. Everything else layers over it as DOM. */
export function SpaceCanvas() {
  // About (its own 3D stage) and Map (a MapLibre WebGL map) cover the scene, so
  // pause this loop while either is open. Keyed on activeId too: leaving must
  // resume rendering immediately, or the camera rig (which runs in this loop)
  // could never start the flight home.
  const paused = useGalaxy((s) => PAUSING_SECTIONS.has(s.activeId ?? '') && s.docked === s.activeId)
  return (
    <div className="space-canvas" aria-hidden="true">
      <Canvas
        frameloop={paused ? 'never' : 'always'}
        dpr={[1, 2]}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: JUMP.fov.rest, near: 0.1, far: 4000, position: [0, 0, 0] }}
      >
        <color attach="background" args={['#03050b']} />
        <AdaptiveDpr />
        <JumpDriver />
        <CameraRig />
        <Nebula />
        <SkyDome />
        <Galaxies />
        <Ship />
        <Course />
        <ViewPan />
        <WarpField />
      </Canvas>
    </div>
  )
}
