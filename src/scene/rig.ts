import { Quaternion, Vector3 } from 'three'

/** Camera tuning. */
export const RIG = {
  home: { pos: new Vector3(0, 10, 86), target: new Vector3(0, -1, 0), fov: 55 },
  /** how far behind the home view the jump starts braking from */
  approachDistance: 170,
  flyIn: 1.8,
  flyOut: 1.5,
  /** docked view: distance in cluster radii, and how far right of the cluster to aim
   *  (puts the cluster in the left half, clear of the panel) */
  dockDistance: 3.6,
  dockAimOffset: 1.35,
  dockFov: 50,
  drift: { home: 1, docked: 0.25 },
  parallax: { x: 4, y: 2.5 },
}

/** Camera orientation before shake — the ship's heading. */
export const heading = new Quaternion()
