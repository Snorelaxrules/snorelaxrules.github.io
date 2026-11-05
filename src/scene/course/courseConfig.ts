/**
 * The gravitational anomaly: a hidden slingshot course to the right of the
 * galaxy map. Layout and every tuning value live here.
 *
 * Units: scene units (About's radius is 18; the ship is ~4.5 long) and seconds.
 * Everything sits in the ship's flight plane (x right, y up, z = SHIP.spawn.z).
 *
 * Gravity from every body: a = G * mass / (dist² + softening²), toward its
 * center, faded out between `physics.influenceFade` distances.
 */

export interface BlackHoleSpec {
  x: number
  y: number
  /** G·mass is what matters; G is in physics */
  mass: number
  softening: number
  /** cross this radius and the ship is gone (crash) */
  horizon: number
  /** visual: dark shadow radius and accretion disk radius */
  shadowRadius: number
  diskRadius: number
}

export interface PlanetSpec {
  x: number
  y: number
  /** solid radius: touching it is a crash */
  radius: number
  mass: number
  softening: number
  /** look: reuses the About page's planet shader */
  seed: number
  seaLevel: number
  palette: 'teal' | 'desert' | 'ice' | 'lava' | 'violet'
}

export interface RingSpec {
  x: number
  y: number
  /** pass within this radius of the center to count it */
  radius: number
}

export const COURSE = {
  /**
   * The course zone. Inside it the ship uses course physics; leaving through
   * the left edge (back toward the galaxy) restores normal flight. The other
   * three edges are soft walls.
   */
  zone: { x0: 76, x1: 345, yMin: -54, yMax: 54 },

  physics: {
    G: 1,
    /** main engine (W), units/s², along the nose. Weaker than a black hole up close */
    thrust: 22,
    /**
     * While the engine fires, sideways drift (relative to the nose) decays at
     * this rate per second, so the ship goes where it points. Coasting is pure
     * momentum (slingshots, and the trajectory preview, are unaffected). 0 = off.
     */
    grip: 3,
    /** brake (S): speed lost per second, units/s² */
    brake: 26,
    /** how fast A/D rotate the ship, rad/s */
    turnRate: 2.8,
    /** velocity decay per second (low: momentum still matters, but coasting bleeds speed) */
    drag: 0.15,
    /** hard speed cap, units/s */
    maxSpeed: 55,
    /** ship collision radius */
    shipRadius: 1,
    /** gravity fades to zero between these distances (keeps far wells from dominating) */
    influenceFade: [55, 85] as [number, number],
    /** soft wall stiffness at the zone edges */
    wallStiffness: 5,
    /** fixed integration step, seconds */
    substep: 1 / 240,
  },

  /** where the race starts. Flying into it begins a 3-2-1 countdown */
  gate: { x: 96, y: 0, radius: 6 } satisfies RingSpec,
  countdown: 3,

  /** checkpoints, in the order they must be passed */
  rings: [
    { x: 128, y: 22, radius: 5 }, // 1: up and over
    { x: 168, y: -22, radius: 5 }, // 2: fall past black hole A
    { x: 222, y: -23, radius: 5 }, // 3: just through the narrow passage
    { x: 262, y: 30, radius: 5 }, // 4: whip around black hole B and climb
    { x: 318, y: 34, radius: 5 }, // 5: end of the long stretch
    { x: 296, y: -30, radius: 5 }, // 6: swing around black hole C and come back
  ] satisfies RingSpec[],

  /** the finish: only opens once every ring is passed */
  wormhole: { x: 214, y: -46, radius: 6 },

  blackHoles: [
    { x: 162, y: 8, mass: 3400, softening: 1.6, horizon: 2, shadowRadius: 2.4, diskRadius: 8 }, // A
    { x: 250, y: -6, mass: 4200, softening: 1.6, horizon: 2.2, shadowRadius: 2.6, diskRadius: 9 }, // B
    { x: 322, y: -2, mass: 3900, softening: 1.6, horizon: 2.1, shadowRadius: 2.5, diskRadius: 8.5 }, // C
  ] satisfies BlackHoleSpec[],

  planets: [
    // the narrow passage (gap between surfaces = 22 - 7 - 7 = 8)
    { x: 196, y: -12, radius: 7, mass: 220, softening: 2, seed: 2.1, seaLevel: 0.5, palette: 'teal' },
    { x: 196, y: -34, radius: 7, mass: 220, softening: 2, seed: 5.6, seaLevel: 0.62, palette: 'desert' },
    // the long stretch: tugs you down toward it
    { x: 290, y: 20, radius: 6, mass: 200, softening: 2, seed: 9.4, seaLevel: 0.45, palette: 'ice' },
    // guards the route from ring 6 back toward the wormhole
    { x: 282, y: -18, radius: 8, mass: 260, softening: 2, seed: 3.3, seaLevel: 0.7, palette: 'lava' },
    // punishes swinging too wide around black hole A
    { x: 140, y: -30, radius: 6, mass: 200, softening: 2, seed: 12.8, seaLevel: 0.4, palette: 'violet' },
  ] satisfies PlanetSpec[],

  /** crash: seconds of effect before respawning */
  crashTime: { planet: 0.55, hole: 0.75 },
  /** wormhole: seconds of warp before the transmission opens */
  warpTime: 1.1,

  /** dotted trajectory preview (T toggles) */
  trajectory: { seconds: 3, points: 90, onByDefault: true },

  camera: {
    /**
     * Inside the course the camera pulls back and narrows its field of view:
     * about the same framing as a wide lens up close, without stretching the
     * planets near the screen edges.
     */
    extraDistance: 100,
    fov: 36,
    /** how quickly the view eases between galaxy and course framing */
    blendRate: 1.6,
  },

  /** hints on the galaxy side */
  sign: { x: 72, y: 16, text: 'Gravitational anomaly', fadeNear: 28, fadeFar: 60 },
  /** marker shown near the entrance after the first completion */
  foundMarker: { x: 86, y: 14 },
  /** warm glow on the right horizon (far behind the map) */
  horizonGlow: { x: 210, y: -4, z: -170, size: 300, opacity: 0.22 },

  /** dust particles per black hole in the course (galaxy hole uses its own) */
  dustPerHole: 160,
}

export const PALETTES: Record<PlanetSpec['palette'], Record<string, string>> = {
  teal: { deepOcean: '#031225', ocean: '#0b3a5e', shallows: '#1c8a9c', land: '#2d7a5e', highlands: '#b9935a', ice: '#e6f2ff', clouds: '#eaf4ff', atmosphere: '#7ae0ff', cityLights: '#ffb36b' },
  desert: { deepOcean: '#2a1406', ocean: '#5a2e12', shallows: '#9a5a26', land: '#c98a4a', highlands: '#f0c27a', ice: '#fff1d8', clouds: '#ffe9cc', atmosphere: '#ffb36b', cityLights: '#ffd38a' },
  ice: { deepOcean: '#0a1830', ocean: '#2a4f7a', shallows: '#7fb4d9', land: '#b8d4ea', highlands: '#e8f2fb', ice: '#ffffff', clouds: '#f4fbff', atmosphere: '#bfe6ff', cityLights: '#9fd8ff' },
  lava: { deepOcean: '#1a0303', ocean: '#4a0d06', shallows: '#c2340f', land: '#2a1a16', highlands: '#4d3028', ice: '#ff9a4d', clouds: '#5a3a33', atmosphere: '#ff6b4d', cityLights: '#ffcf5c' },
  violet: { deepOcean: '#0d0622', ocean: '#2a1458', shallows: '#6a4bc2', land: '#3d2a6b', highlands: '#c08cff', ice: '#efe4ff', clouds: '#efe6ff', atmosphere: '#c08cff', cityLights: '#ff9ad5' },
}
