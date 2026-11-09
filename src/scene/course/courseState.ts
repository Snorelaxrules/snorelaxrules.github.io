import { create } from 'zustand'
import { ship } from '../ship/shipState'
import { COURSE } from './courseConfig'

export type CourseStatus = 'idle' | 'countdown' | 'racing' | 'crashed' | 'finishing' | 'done'

/** Mutable per-frame course state (never React state). */
export const course = {
  status: 'idle' as CourseStatus,
  /** ship is inside the course zone and flying */
  inZone: false,
  /** index of the next ring to pass; === rings.length means the wormhole is open */
  next: 0,
  /** race clock, seconds (starts at GO) */
  time: 0,
  /** seconds left in the countdown */
  countdown: 0,
  /** seconds into the current crash or warp effect */
  fxTime: 0,
  crashKind: 'planet' as 'planet' | 'hole',
  /** center of the black hole that ate us (for the stretch) */
  crashX: 0,
  crashY: 0,
  /** 0..1 screen flash (crash) and warp (wormhole), read by the HUD */
  flash: 0,
  warp: 0,
  /** was the ship inside the gate last frame (gate triggers on entry) */
  inGate: false,
  trajectory: COURSE.trajectory.onByDefault,
}

/** Camera framing blend, 0 = galaxy, 1 = course (damped by the ship loop). */
export const courseView = { k: 0 }

// --- persistence -----------------------------------------------------------

const BEST_KEY = 'tl:course-best'
const FOUND_KEY = 'tl:anomaly-found'

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable: best time / found marker just won't persist
  }
}

const storedBest = Number(read(BEST_KEY))

// --- React-facing state (changes rarely: entering/leaving, countdown digits, finish) --

interface CourseUi {
  inCourse: boolean
  /** 3, 2, 1, then 0 for "GO"; null when not counting */
  countdown: number | null
  secretOpen: boolean
  found: boolean
  best: number | null
  lastTime: number | null
  trajectory: boolean
  set: (patch: Partial<Omit<CourseUi, 'set'>>) => void
}

export const useCourse = create<CourseUi>()((set) => ({
  inCourse: false,
  countdown: null,
  secretOpen: false,
  found: read(FOUND_KEY) === '1',
  best: Number.isFinite(storedBest) && storedBest > 0 ? storedBest : null,
  lastTime: null,
  trajectory: course.trajectory,
  set: (patch) => set(patch),
}))

// --- actions -----------------------------------------------------------------

const target = () => (course.next < COURSE.rings.length ? COURSE.rings[course.next] : COURSE.wormhole)

/** Place the ship at (x, y), stopped, facing the next target. */
function placeShip(x: number, y: number) {
  ship.pos.x = x
  ship.pos.y = y
  ship.vel.set(0, 0, 0)
  const t = target()
  ship.heading = Math.atan2(t.y - y, t.x - x)
  ship.bank = 0
  ship.spin = 0
  ship.stretch = 0
  ship.fxScale = 1
}

export function startCountdown() {
  course.status = 'countdown'
  course.next = 0
  course.time = 0
  course.countdown = COURSE.countdown
  course.inGate = true
  placeShip(COURSE.gate.x, COURSE.gate.y)
  useCourse.getState().set({ countdown: Math.ceil(COURSE.countdown) })
}

/** Back to the last ring passed (or the gate), at rest. */
export function respawn() {
  if (course.status === 'countdown' || course.status === 'finishing' || course.status === 'done') return
  if (course.status === 'racing' || course.status === 'crashed') {
    const last = course.next > 0 ? COURSE.rings[course.next - 1] : COURSE.gate
    course.status = 'racing'
    placeShip(last.x, last.y)
  } else {
    // not racing: just in front of the gate
    course.status = 'idle'
    course.inGate = false
    placeShip(COURSE.gate.x - COURSE.gate.radius - 4, COURSE.gate.y)
  }
  course.flash = Math.max(course.flash, 0.35)
}

/**
 * Fly into the course zone: straight to the spawn point in front of the start
 * gate, stopped and facing it, instead of drifting in on galaxy momentum.
 */
export function enterCourse() {
  resetRace()
  placeShip(COURSE.gate.x - COURSE.gate.radius - 4, COURSE.gate.y)
  ship.heading = 0
  course.flash = Math.max(course.flash, 0.35)
}

/** Leave the course: back to the galaxy side, next to the gate. */
export function exitCourse() {
  resetRace()
  placeShip(COURSE.zone.x0 - 8, COURSE.gate.y)
  ship.heading = Math.PI
}

export function resetRace() {
  course.status = 'idle'
  course.next = 0
  course.time = 0
  course.fxTime = 0
  course.warp = 0
  course.inGate = false
  ship.stretch = 0
  ship.fxScale = 1
  useCourse.getState().set({ countdown: null })
}

export function replayCourse() {
  useCourse.getState().set({ secretOpen: false })
  course.warp = 0
  startCountdown()
}

export function closeSecret() {
  useCourse.getState().set({ secretOpen: false })
  exitCourse()
}

export function toggleTrajectory() {
  course.trajectory = !course.trajectory
  useCourse.getState().set({ trajectory: course.trajectory })
}

/** Called once the warp finishes. */
export function completeCourse() {
  const t = course.time
  const ui = useCourse.getState()
  const best = ui.best === null ? t : Math.min(ui.best, t)
  write(BEST_KEY, String(best))
  write(FOUND_KEY, '1')
  course.status = 'done'
  ui.set({ secretOpen: true, found: true, best, lastTime: t, countdown: null })
}

export const formatTime = (s: number) => {
  const m = Math.floor(s / 60)
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0')}`
}
