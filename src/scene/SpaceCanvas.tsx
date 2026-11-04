import { Canvas } from '@react-three/fiber'
import { JUMP } from '../intro/timeline'
import { AdaptiveDpr } from './AdaptiveDpr'
import { CameraRig } from './CameraRig'
import { Galaxies } from './galaxy/Galaxies'
import { JumpDriver } from './JumpDriver'
import { Nebula } from './Nebula'
import { SkyDome } from './SkyDome'
import { WarpField } from './WarpField'

/** The one persistent WebGL canvas. Everything else layers over it as DOM. */
export function SpaceCanvas() {
  return (
    <div className="space-canvas" aria-hidden="true">
      <Canvas
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
        <WarpField />
      </Canvas>
    </div>
  )
}
