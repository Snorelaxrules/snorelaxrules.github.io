/**
 * Hyperspace jump timeline — the single source of truth for both the WebGL scene
 * and the DOM overlays. All times are seconds from the moment the lever is pulled.
 * Tweak feel here.
 */
export const JUMP = {
  duration: 3.6,
  /** warp ramps 0 → 1 over this window (ease-in: slow stretch, then snap) */
  accel: [0.25, 2.05] as const,
  /** white flash: start, peak, end. The cockpit disappears at the peak. */
  flash: [1.85, 2.05, 2.45] as const,
  /** warp falls 1 → 0 over this window (ease-out: hard brake, gentle settle) */
  decel: [2.05, 3.6] as const,
  fov: { rest: 55, peak: 100 },
  /** world units per second */
  speed: { cruise: 2.5, max: 700, arrived: 0.6 },
  /** opacity of the near-star layer outside of warp (it's mostly there to streak) */
  dust: { cruise: 0.3, arrived: 0 },
  /** streak length in world units per unit of speed */
  streakPerSpeed: 0.1,
  /** 0 disables camera/cockpit shake */
  shake: 1,
  /** prefers-reduced-motion and "Skip intro": a plain crossfade of this length */
  reducedDuration: 0.8,
}

export type JumpMode = 'full' | 'reduced'

export interface JumpSample {
  t: number
  /** 0 = at rest, 1 = full hyperspace */
  warp: number
  /** base opacity of the near-star layer */
  dust: number
  speed: number
  fov: number
  flash: number
  shake: number
  cockpitOpacity: number
  done: boolean
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (e0: number, e1: number, x: number) => {
  const u = clamp01((x - e0) / (e1 - e0))
  return u * u * (3 - 2 * u)
}
const mix = (a: number, b: number, u: number) => a + (b - a) * u

export const IDLE_SAMPLE: JumpSample = {
  t: 0,
  warp: 0,
  dust: JUMP.dust.cruise,
  speed: JUMP.speed.cruise,
  fov: JUMP.fov.rest,
  flash: 0,
  shake: 0,
  cockpitOpacity: 1,
  done: false,
}

export const ARRIVED_SAMPLE: JumpSample = {
  ...IDLE_SAMPLE,
  speed: JUMP.speed.arrived,
  dust: JUMP.dust.arrived,
  cockpitOpacity: 0,
  done: true,
}

export function sampleJump(t: number, mode: JumpMode): JumpSample {
  if (mode === 'reduced') {
    const u = smooth(0, JUMP.reducedDuration, t)
    return {
      ...IDLE_SAMPLE,
      t,
      speed: mix(JUMP.speed.cruise, JUMP.speed.arrived, u),
      dust: mix(JUMP.dust.cruise, JUMP.dust.arrived, u),
      cockpitOpacity: 1 - u,
      done: t >= JUMP.reducedDuration,
    }
  }

  const [a0, a1] = JUMP.accel
  const [d0, d1] = JUMP.decel
  const [f0, fPeak, f1] = JUMP.flash

  let warp = 0
  if (t >= a0 && t < a1) warp = ((t - a0) / (a1 - a0)) ** 3
  else if (t >= d0 && t < d1) warp = (1 - (t - d0) / (d1 - d0)) ** 3

  const base = mix(JUMP.speed.cruise, JUMP.speed.arrived, smooth(0, JUMP.duration, t))
  // fast attack, then a quick falloff so it doesn't linger as a grey veil
  const flash = t < fPeak ? smooth(f0, fPeak, t) : (1 - clamp01((t - fPeak) / (f1 - fPeak))) ** 3
  const shake =
    t < fPeak
      ? JUMP.shake * smooth(a0, a1, t)
      : JUMP.shake * 0.6 * (1 - smooth(fPeak, fPeak + 0.6, t))

  return {
    t,
    warp,
    dust: mix(JUMP.dust.cruise, JUMP.dust.arrived, smooth(0, JUMP.duration, t)),
    speed: mix(base, JUMP.speed.max, warp),
    fov: mix(JUMP.fov.rest, JUMP.fov.peak, warp * warp),
    flash,
    shake,
    cockpitOpacity: t < fPeak ? 1 : 0,
    done: t >= JUMP.duration,
  }
}

/** Cheap deterministic jitter in [-1, 1] for shake. */
export function jitter(t: number, seed: number) {
  return Math.sin(t * 47.3 + seed * 13.1) * 0.6 + Math.sin(t * 83.7 + seed * 7.7) * 0.4
}
