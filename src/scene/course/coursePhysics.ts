/**
 * Course physics: weak thrust, near-zero drag, gravity from black holes and
 * planets, fixed-timestep semi-implicit Euler. Operates on the shared `ship`
 * and `course` state; called from the ship's frame loop while in the zone.
 */
import { ship } from '../ship/shipState'
import { COURSE } from './courseConfig'
import { completeCourse, course, respawn, startCountdown, useCourse } from './courseState'

const P = COURSE.physics
const Z = COURSE.zone

interface Body {
  x: number
  y: number
  gm: number
  eps2: number
  /** crash radius: planet surface + ship, or the event horizon */
  hit: number
  kind: 'planet' | 'hole'
}

const BODIES: Body[] = [
  ...COURSE.blackHoles.map((b): Body => ({ x: b.x, y: b.y, gm: P.G * b.mass, eps2: b.softening ** 2, hit: b.horizon, kind: 'hole' })),
  ...COURSE.planets.map((p): Body => ({ x: p.x, y: p.y, gm: P.G * p.mass, eps2: p.softening ** 2, hit: p.radius + P.shipRadius, kind: 'planet' })),
]

const [F0, F1] = P.influenceFade
const smoothstep = (e0: number, e1: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return u * u * (3 - 2 * u)
}

/** Gravity at (x, y) into out[0..1]; returns the body hit, if any. */
function gravity(x: number, y: number, out: Float64Array): Body | null {
  out[0] = 0
  out[1] = 0
  for (const b of BODIES) {
    const dx = b.x - x
    const dy = b.y - y
    const r2 = dx * dx + dy * dy
    const r = Math.sqrt(r2)
    if (r < b.hit) return b
    const fade = 1 - smoothstep(F0, F1, r)
    if (fade <= 0) continue
    const a = (b.gm / (r2 + b.eps2)) * fade
    out[0] += (dx / r) * a
    out[1] += (dy / r) * a
  }
  return null
}

const acc = new Float64Array(2)

function walls(x: number, y: number, vx: number, vy: number, h: number): [number, number] {
  const k = P.wallStiffness * h
  if (x > Z.x1) vx -= (x - Z.x1) * k
  if (y > Z.yMax) vy -= (y - Z.yMax) * k
  if (y < Z.yMin) vy -= (y - Z.yMin) * k
  return [vx, vy]
}

const within = (r: { x: number; y: number; radius: number }) => Math.hypot(ship.pos.x - r.x, ship.pos.y - r.y) < r.radius

function crash(b: Body) {
  course.status = 'crashed'
  course.fxTime = 0
  course.crashKind = b.kind
  course.crashX = b.x
  course.crashY = b.y
  if (b.kind === 'planet') course.flash = 1
}

/**
 * One frame of course simulation. `engine`: W is held (thrust along the nose,
 * with grip). `brake`: S is held. Returns the ship's speed.
 */
export function stepCourse(dt: number, engine: boolean, brake: boolean, reduced: boolean): number {
  const { pos, vel } = ship
  switch (course.status) {
    case 'countdown': {
      vel.set(0, 0, 0)
      const before = Math.ceil(course.countdown)
      course.countdown -= dt
      const after = Math.ceil(course.countdown)
      if (course.countdown <= 0) {
        course.status = 'racing'
        course.time = 0
        // 0 shows "GO"; the HUD clears it
        useCourse.getState().set({ countdown: 0 })
      } else if (after !== before) {
        useCourse.getState().set({ countdown: after })
      }
      return 0
    }
    case 'crashed': {
      course.time += dt
      course.fxTime += dt
      if (course.crashKind === 'hole') {
        const T = COURSE.crashTime.hole
        const u = Math.min(1, course.fxTime / T)
        // spaghettified: stretched toward the singularity and pulled in
        const k = 1 - Math.exp(-6 * dt)
        pos.x += (course.crashX - pos.x) * k
        pos.y += (course.crashY - pos.y) * k
        ship.heading = Math.atan2(course.crashY - pos.y, course.crashX - pos.x) || ship.heading
        ship.stretch = reduced ? 0 : u
        ship.fxScale = 1 - u * 0.85
        if (u > 0.7) course.flash = Math.max(course.flash, (u - 0.7) / 0.3)
        if (u >= 1) respawn()
      } else {
        const T = COURSE.crashTime.planet
        const u = Math.min(1, course.fxTime / T)
        ship.fxScale = Math.max(0, 1 - u * 3)
        if (u >= 1) respawn()
      }
      vel.set(0, 0, 0)
      return 0
    }
    case 'finishing': {
      course.fxTime += dt
      const u = Math.min(1, course.fxTime / COURSE.warpTime)
      const w = COURSE.wormhole
      const k = 1 - Math.exp(-5 * dt)
      pos.x += (w.x - pos.x) * k
      pos.y += (w.y - pos.y) * k
      if (!reduced) ship.spin += dt * (4 + 20 * u)
      ship.fxScale = 1 - u
      course.warp = reduced ? Math.min(1, u * 1.2) : u * u
      vel.set(0, 0, 0)
      if (u >= 1) completeCourse()
      return 0
    }
    case 'done':
      vel.set(0, 0, 0)
      return 0
  }

  // idle (wandering before the gate) or racing
  const steps = Math.max(1, Math.ceil(dt / P.substep))
  const h = dt / steps
  const fx = Math.cos(ship.heading)
  const fy = Math.sin(ship.heading)
  const thrust = engine ? P.thrust : 0
  const grip = engine ? Math.exp(-P.grip * h) : 1
  const decay = Math.exp(-P.drag * h)
  for (let i = 0; i < steps; i++) {
    const hit = gravity(pos.x, pos.y, acc)
    if (hit) {
      crash(hit)
      return 0
    }
    let vx = vel.x + (acc[0] + fx * thrust) * h
    let vy = vel.y + (acc[1] + fy * thrust) * h
    if (engine) {
      // split into along-nose and sideways parts; bleed off the sideways drift
      const along = vx * fx + vy * fy
      const side = (vy * fx - vx * fy) * grip
      vx = along * fx - side * fy
      vy = along * fy + side * fx
    }
    if (brake) {
      const sp = Math.hypot(vx, vy)
      const k = sp > 0 ? Math.max(0, sp - P.brake * h) / sp : 0
      vx *= k
      vy *= k
    }
    vx *= decay
    vy *= decay
    ;[vx, vy] = walls(pos.x, pos.y, vx, vy, h)
    const sp = Math.hypot(vx, vy)
    if (sp > P.maxSpeed) {
      vx *= P.maxSpeed / sp
      vy *= P.maxSpeed / sp
    }
    vel.x = vx
    vel.y = vy
    pos.x += vx * h
    pos.y += vy * h
  }

  if (course.status === 'idle') {
    const inGate = within(COURSE.gate)
    if (inGate && !course.inGate) {
      startCountdown()
      return 0
    }
    course.inGate = inGate
  } else {
    course.time += dt
    if (course.next < COURSE.rings.length) {
      if (within(COURSE.rings[course.next])) course.next++
    } else if (Math.hypot(pos.x - COURSE.wormhole.x, pos.y - COURSE.wormhole.y) < COURSE.wormhole.radius * 0.75) {
      course.status = 'finishing'
      course.fxTime = 0
    }
  }
  return Math.hypot(vel.x, vel.y)
}

/**
 * Predicted path under gravity alone (no thrust), written as x, y pairs into
 * `out`. Stops at a collision. Returns the number of points written.
 */
export function predictPath(out: Float32Array, points: number, seconds: number): number {
  const steps = Math.ceil(seconds / P.substep)
  const stride = Math.max(1, Math.floor(steps / points))
  const h = P.substep
  let x = ship.pos.x
  let y = ship.pos.y
  let vx = ship.vel.x
  let vy = ship.vel.y
  let n = 0
  for (let i = 1; i <= steps && n < points; i++) {
    if (gravity(x, y, acc)) break
    const decay = Math.exp(-P.drag * h)
    vx = (vx + acc[0] * h) * decay
    vy = (vy + acc[1] * h) * decay
    ;[vx, vy] = walls(x, y, vx, vy, h)
    const sp = Math.hypot(vx, vy)
    if (sp > P.maxSpeed) {
      vx *= P.maxSpeed / sp
      vy *= P.maxSpeed / sp
    }
    x += vx * h
    y += vy * h
    if (i % stride === 0) {
      out[n * 2] = x
      out[n * 2 + 1] = y
      n++
    }
  }
  return n
}

export const inCourseZone = (x: number) => x > Z.x0
