/**
 * Input handling for Cargo Loader: maps key codes to actions and implements
 * DAS / ARR / DCD / SDF from key timestamps (ms, performance.now() timeline).
 * No DOM: the component feeds it press/release events and calls update() each frame.
 */
import { type Action, HANDLING, type Handling, KEYS } from './config'
import type { Game } from './engine'

/** KeyboardEvent.code → action, built from KEYS. */
export const KEY_ACTIONS: ReadonlyMap<string, Action> = new Map(
  (Object.entries(KEYS) as [Action, string[]][]).flatMap(([action, codes]) => codes.map((c) => [c, action] as const)),
)

type Dir = -1 | 0 | 1

export class InputController {
  private readonly h: Handling
  private left = false
  private right = false
  private soft = false
  /** direction currently charging / auto-shifting: the most recently pressed one still held */
  private dir: Dir = 0
  /** when the active direction started charging */
  private dasStart = 0
  /** auto-repeat moves made since DAS charged (ARR > 0 only) */
  private repeats = 0
  /** auto-shift is paused until this time (DCD) */
  private cutUntil = -Infinity
  private seenPiece = -1

  constructor(handling: Partial<Handling> = {}) {
    this.h = { ...HANDLING, ...handling }
  }

  /** Soft drop is held (Game.tick uses the shorter lock delay). */
  get softHeld() {
    return this.soft
  }

  /** Gravity multiplier for Game.tick (finite soft drop factors). */
  get gravityFactor() {
    return this.soft && Number.isFinite(this.h.sdf) ? this.h.sdf : 1
  }

  press(action: Action, t: number, game: Game) {
    switch (action) {
      case 'moveLeft':
      case 'moveRight': {
        const d = action === 'moveLeft' ? -1 : 1
        if (d === -1) this.left = true
        else this.right = true
        // newest direction wins; a fresh press taps once and starts charging
        this.dir = d
        this.dasStart = t
        this.repeats = 0
        game.moveX(d)
        break
      }
      case 'softDrop':
        this.soft = true
        break
      case 'hardDrop':
        game.hardDrop()
        break
      case 'rotateCW':
        game.rotate(1)
        this.cut(t)
        break
      case 'rotateCCW':
        game.rotate(-1)
        this.cut(t)
        break
      case 'rotate180':
        game.rotate(2)
        this.cut(t)
        break
      case 'hold':
        game.holdPiece()
        break
      case 'restart':
        break
    }
    this.update(t, game)
  }

  release(action: Action, t: number) {
    if (action === 'softDrop') {
      this.soft = false
      return
    }
    if (action !== 'moveLeft' && action !== 'moveRight') return
    const d = action === 'moveLeft' ? -1 : 1
    if (d === -1) this.left = false
    else this.right = false
    if (this.dir !== d) return
    // fall back to the other direction if it's still held; it charges afresh
    const other = d === -1 ? this.right : this.left
    this.dir = other ? (-d as Dir) : 0
    this.dasStart = t
    this.repeats = 0
  }

  /** Apply auto-shift and soft drop at time `now`. Safe to call any number of times per frame. */
  update(now: number, game: Game) {
    if (game.pieceCount !== this.seenPiece) {
      // new piece (spawn or hold): DAS charge carries over; DCD may pause it
      if (this.seenPiece !== -1) this.cut(now)
      this.seenPiece = game.pieceCount
    }
    // soft drop finishes first, so a held direction slides the piece along
    // the floor/stack rather than across the top and then down
    const instantSoft = this.soft && !Number.isFinite(this.h.sdf)
    if (instantSoft) game.softDrop()
    if (this.dir !== 0 && now >= this.cutUntil) {
      const charged = now - this.dasStart - this.h.das
      if (charged >= 0) {
        if (this.h.arr <= 0) {
          game.slide(this.dir)
        } else {
          const due = 1 + Math.floor(charged / this.h.arr)
          for (; this.repeats < due; this.repeats++) game.moveX(this.dir)
        }
      }
    }
    // ...and again after a slide, in case it moved over a gap
    if (instantSoft) game.softDrop()
  }

  reset() {
    this.left = this.right = this.soft = false
    this.dir = 0
    this.repeats = 0
    this.cutUntil = -Infinity
    this.seenPiece = -1
  }

  private cut(t: number) {
    if (this.h.dcd > 0) this.cutUntil = t + this.h.dcd
  }
}
