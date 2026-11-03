import { Quaternion, Vector3 } from 'three'

/** Camera tuning. */
export const RIG = {
  home: { pos: new Vector3(0, 10, 86), target: new Vector3(0, -1, 0), fov: 55 },
  /** how far behind the home view the jump starts braking from */
  approachDistance: 170,
  flyIn: 1.6,
  flyOut: 1.4,
  /** docked view: dive into the cluster's core. Distance is in cluster radii. */
  dockDistance: 0.45,
  /** wider FOV at the end of the dive sells the rush */
  dockFov: 68,
  /** fraction of the dive at which the page starts fading in */
  pageRevealAt: 0.72,
  drift: { home: 1, docked: 0.1 },
  parallax: { x: 4, y: 2.5 },
}

/** Camera orientation before shake — the ship's heading. */
export const heading = new Quaternion()
