import { Vector3 } from 'three'

/**
 * Ship feel. Units are scene units (About's radius is 18) and seconds.
 * The ship flies in the screen plane (x/y) at a fixed depth in front of the clusters.
 */
export const SHIP = {
  /** where the ship waits on arrival: just below About, outside its range */
  spawn: new Vector3(0, -25, 18),
  scale: 1.4,

  /** thrust acceleration, units/s² */
  accel: 70,
  /** top speed, units/s */
  maxSpeed: 30,
  /** velocity decay rate per second (exponential). Higher = stops sooner when you let go */
  drag: 1.8,
  /** how quickly the nose swings to face the direction of travel */
  turnRate: 7,
  /** bank (roll) per rad/s of turning, and the cap, in radians */
  bankAmount: 0.14,
  maxBank: 0.6,

  /** soft world bounds: past these the ship is pushed back by a spring */
  bounds: { x: 64, yMin: -31, yMax: 26 },
  boundaryStiffness: 6,

  /** in-range radius around a cluster = base + cluster.size * perSize (screen-plane distance) */
  proximity: { base: 4, perSize: 0.9 },
  /** on leaving a section, the ship reappears this far outside that cluster's range */
  returnGap: 3,

  camera: {
    /** 0 = camera ignores the ship, 1 = keeps it pinned on screen */
    follow: 0.8,
    /** follow smoothing (higher = tighter); reduced motion uses the snappier value */
    lag: 2.2,
    lagReduced: 9,
  },

  trail: {
    maxParticles: 220,
    /** particles/s while coasting and at full thrust */
    rateIdle: 6,
    rateThrust: 110,
    /** seconds */
    life: 0.9,
    /** emission and lifetime multiplier under reduced motion */
    reducedScale: 0.3,
  },

  hint: {
    /** hide the controls hint after this many seconds of flying */
    hideAfterFlying: 10,
    /** bring it back after this many seconds without input */
    showAfterIdle: 6,
  },
}
