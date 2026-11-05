/**
 * Cargo Loader (the dashboard block-stacking game): tuning in one place.
 * Times are milliseconds of real time, so behaviour is identical at any refresh rate.
 */

/** Handling, TETR.IO-style. */
export const HANDLING = {
  /** Delayed Auto Shift: how long a direction is held before it auto-repeats. 4.5 frames @ 60fps. */
  das: 75,
  /** Auto Repeat Rate: ms between auto-repeat moves once DAS charges. 0 = straight to the wall. */
  arr: 0,
  /** DAS Cut Delay: pause auto-shift for this long after a rotate, hold, or new piece. 0 = never. */
  dcd: 0,
  /** Soft Drop Factor: multiplier on gravity while soft dropping. Infinity = straight to the floor (no lock). */
  sdf: Infinity,
  /**
   * Carry a held direction's DAS charge into the next piece (TETR.IO does).
   * Off = a new piece spawns centred and a still-held direction re-charges first.
   */
  carryDas: true,
  /**
   * With soft drop held, wait this long before soft dropping each new piece,
   * so there's a moment to move it at the top first. A fresh press drops at once.
   */
  softDropDelay: 120,
}

export type Handling = typeof HANDLING

/** Game rules. */
export const RULES = {
  /** game length in ms; the score is lines cleared. 0 = endless */
  timeLimit: 60_000,
  /** how long a grounded piece waits before locking */
  lockDelay: 500,
  /** successful moves/rotations that may reset the lock timer, per piece */
  maxLockResets: 15,
  /**
   * Refill the reset budget whenever the piece reaches a new lowest row (classic
   * "extended placement"). Off = 15 resets per piece in total, so a piece
   * can't be slid down the stack indefinitely. A new low always restarts the timer.
   */
  refillResetsOnNewLow: false,
  linesPerLevel: 10,
  /** gravity cap in cells per second */
  maxGravity: 20,
  /** pieces shown in the next queue */
  previews: 5,
}

export type Rules = typeof RULES

/**
 * Keybinds, by KeyboardEvent.code (physical key, layout-independent).
 * Add or swap codes freely; every action takes a list.
 */
export const KEYS = {
  moveLeft: ['ArrowLeft'],
  moveRight: ['ArrowRight'],
  softDrop: ['ArrowDown'],
  hardDrop: ['Space'],
  rotateCW: ['ArrowUp', 'KeyX'],
  rotateCCW: ['KeyZ'],
  rotate180: ['KeyA'],
  hold: ['ShiftLeft', 'ShiftRight', 'KeyC'],
  restart: ['KeyR'],
} satisfies Record<string, string[]>

export type Action = keyof typeof KEYS

/** Block colours: cockpit-tinted, one distinct hue per piece. */
export const THEME = {
  pieces: {
    I: '#5fdcff',
    O: '#ffcd5e',
    T: '#c08cff',
    S: '#5fe3a0',
    Z: '#ff6b82',
    J: '#5d8bff',
    L: '#ff9a4d',
  },
  well: '#030811',
  grid: 'rgba(122, 224, 255, 0.07)',
  wellEdge: 'rgba(122, 224, 255, 0.35)',
  /** locked blocks after game over */
  dead: '#2a3550',
}
