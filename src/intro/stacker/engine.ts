/**
 * Cargo Loader game logic: board, 7-bag, hold, SRS+ rotation, gravity, lock delay.
 * Pure TypeScript (no DOM, no React) and driven by elapsed milliseconds, so it
 * is deterministic and unit-testable.
 *
 * Coordinates: x is the column (0 = left), y is the row counted from the BOTTOM
 * (0 = floor). A piece's (x, y) is the top-left of its bounding box.
 */
import { RULES, type Rules } from './config'
import { BOX_SIZE, PIECES, type PieceType, type Rotation, SHAPES, kickTests } from './pieces'

export const WIDTH = 10
export const VISIBLE = 20
/** total rows including the hidden buffer above the visible field */
export const HEIGHT = 40
/** box top row on spawn: pieces appear in rows 21–22 (1-indexed), just above the field */
const SPAWN_Y = 21

export interface Piece {
  type: PieceType
  rot: Rotation
  x: number
  y: number
}

export type Cell = [number, number]

export function pieceCells(p: Piece): Cell[] {
  return SHAPES[p.type][p.rot].map(([cx, cy]): Cell => [p.x + cx, p.y - cy])
}

export function spawnPosition(type: PieceType): Piece {
  return { type, rot: 0, x: BOX_SIZE[type] === 2 ? 4 : 3, y: SPAWN_Y }
}

/** Seeded PRNG (mulberry32), handy for tests and replays. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 7-bag randomizer: every run of seven is one of each piece, shuffled. */
export class Bag {
  private bag: PieceType[] = []
  private readonly random: () => number
  constructor(random: () => number = Math.random) {
    this.random = random
  }
  next(): PieceType {
    if (this.bag.length === 0) {
      const b = [...PIECES]
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1))
        ;[b[i], b[j]] = [b[j], b[i]]
      }
      this.bag = b
    }
    return this.bag.pop() as PieceType
  }
}

export interface GameOptions {
  random?: () => number
  rules?: Partial<Rules>
}

const PIECE_CODE: Record<PieceType, number> = Object.fromEntries(PIECES.map((t, i) => [t, i + 1])) as Record<PieceType, number>

export class Game {
  readonly rules: Rules
  /** row-major from the floor up: board[y * WIDTH + x], 0 = empty, else PIECES index + 1 */
  readonly board = new Uint8Array(WIDTH * HEIGHT)
  active: Piece | null = null
  hold: PieceType | null = null
  /** hold already used for the current piece */
  holdUsed = false
  queue: PieceType[] = []
  lines = 0
  /** game time in ms (only advances in tick) */
  time = 0
  over = false
  /** increments on every spawn (input uses it to notice new pieces) */
  pieceCount = 0
  /** index of the kick test used by the last successful rotation (0 = no kick) */
  lastKick = -1
  /** lines cleared by the most recent lock */
  lastClear = 0
  onLines: ((n: number) => void) | null = null

  private readonly bag: Bag
  private gravityAcc = 0
  private lockTimer = 0
  private lockResets = 0
  /** lowest row the current piece has reached; a new low refreshes lock resets */
  private lowest = Infinity
  /** the current piece has touched down since its last new low */
  private touched = false

  constructor(opts: GameOptions = {}) {
    this.rules = { ...RULES, ...opts.rules }
    this.bag = new Bag(opts.random)
    this.fillQueue()
    this.spawn(this.takeNext())
  }

  get level() {
    return 1 + Math.floor(this.lines / this.rules.linesPerLevel)
  }

  /** Gravity in cells per second: guideline curve, starting at 1 cell/s, capped. */
  get gravity() {
    const l = this.level - 1
    const secondsPerRow = Math.max(0.8 - l * 0.007, 0.01) ** l
    return Math.min(1 / secondsPerRow, this.rules.maxGravity)
  }

  get(x: number, y: number) {
    return this.board[y * WIDTH + x]
  }

  set(x: number, y: number, v: number) {
    this.board[y * WIDTH + x] = v
  }

  fits(p: Piece) {
    for (const [x, y] of pieceCells(p)) {
      if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return false
      if (this.board[y * WIDTH + x]) return false
    }
    return true
  }

  get grounded() {
    const p = this.active
    return !!p && !this.fits({ ...p, y: p.y - 1 })
  }

  /** Where the active piece would land. */
  ghost(): Piece | null {
    const p = this.active
    if (!p) return null
    let y = p.y
    while (this.fits({ ...p, y: y - 1 })) y--
    return { ...p, y }
  }

  preview(): PieceType[] {
    return this.queue.slice(0, this.rules.previews)
  }

  // --- actions (return whether anything happened) ------------------------------

  moveX(dir: -1 | 1): boolean {
    if (!this.step(dir)) return false
    this.afterMove()
    return true
  }

  /** Shift as far as possible (ARR 0). Counts as one move for lock resets. */
  slide(dir: -1 | 1): number {
    let n = 0
    while (this.step(dir)) n++
    if (n) this.afterMove()
    return n
  }

  /** Infinite soft drop: straight to the floor without locking. */
  softDrop(): number {
    const p = this.active
    if (!p || this.over) return 0
    const g = this.ghost() as Piece
    const n = p.y - g.y
    if (n) {
      this.active = g
      this.refreshLowest()
    }
    return n
  }

  hardDrop() {
    if (!this.active || this.over) return
    this.active = this.ghost()
    this.lock()
  }

  /** turn: 1 = clockwise, -1 = counterclockwise, 2 = 180. */
  rotate(turn: 1 | -1 | 2): boolean {
    const p = this.active
    if (!p || this.over) return false
    const to = ((p.rot + turn + 4) % 4) as Rotation
    const tests = kickTests(p.type, p.rot, to)
    for (let i = 0; i < tests.length; i++) {
      const [dx, dy] = tests[i]
      const c: Piece = { type: p.type, rot: to, x: p.x + dx, y: p.y + dy }
      if (this.fits(c)) {
        this.active = c
        this.lastKick = i
        this.afterMove()
        return true
      }
    }
    return false
  }

  holdPiece(): boolean {
    const p = this.active
    if (!p || this.over || this.holdUsed) return false
    const next = this.hold ?? this.takeNext()
    this.hold = p.type
    this.spawn(next)
    this.holdUsed = true
    return true
  }

  /**
   * Advance time: gravity and lock delay. `softFactor` multiplies gravity
   * (finite soft drop factors); infinite soft drop is handled by softDrop().
   */
  tick(dt: number, softFactor = 1) {
    if (this.over || !this.active) return
    this.time += dt
    if (this.grounded) {
      this.gravityAcc = 0
      this.touched = true
      if (this.lockResets >= this.rules.maxLockResets) {
        this.lock()
        return
      }
      this.lockTimer += dt
      if (this.lockTimer >= this.rules.lockDelay) this.lock()
      return
    }
    this.gravityAcc += (dt / 1000) * this.gravity * softFactor
    while (this.gravityAcc >= 1) {
      const p: Piece = this.active
      if (!this.fits({ ...p, y: p.y - 1 })) {
        this.gravityAcc = 0
        break
      }
      this.active = { ...p, y: p.y - 1 }
      this.gravityAcc -= 1
      this.refreshLowest()
    }
  }

  // --- internals -------------------------------------------------------------

  private step(dir: -1 | 1) {
    const p = this.active
    if (!p || this.over) return false
    const c = { ...p, x: p.x + dir }
    if (!this.fits(c)) return false
    this.active = c
    return true
  }

  private bottom(p: Piece) {
    return Math.min(...pieceCells(p).map(([, y]) => y))
  }

  /** New lowest row: fresh lock timer and reset budget. */
  private refreshLowest() {
    const b = this.bottom(this.active as Piece)
    if (b >= this.lowest) return false
    this.lowest = b
    this.lockResets = 0
    this.lockTimer = 0
    this.touched = false
    return true
  }

  /** A successful move or rotation: resets the lock timer while it has resets left. */
  private afterMove() {
    if (this.refreshLowest()) return
    if (!this.touched && !this.grounded) return
    if (this.lockResets < this.rules.maxLockResets) {
      this.lockResets++
      this.lockTimer = 0
    }
  }

  private lock() {
    const p = this.active
    if (!p) return
    const cells = pieceCells(p)
    for (const [x, y] of cells) this.set(x, y, PIECE_CODE[p.type])
    this.active = null

    // lock out: the whole piece came to rest above the visible field
    if (cells.every(([, y]) => y >= VISIBLE)) {
      this.over = true
      return
    }

    let cleared = 0
    for (let y = 0; y < HEIGHT; ) {
      let full = true
      for (let x = 0; x < WIDTH; x++) {
        if (!this.board[y * WIDTH + x]) {
          full = false
          break
        }
      }
      if (full) {
        this.board.copyWithin(y * WIDTH, (y + 1) * WIDTH)
        this.board.fill(0, (HEIGHT - 1) * WIDTH)
        cleared++
      } else {
        y++
      }
    }
    this.lastClear = cleared
    if (cleared) {
      this.lines += cleared
      this.onLines?.(cleared)
    }
    this.holdUsed = false
    this.spawn(this.takeNext())
  }

  private spawn(type: PieceType) {
    const p = spawnPosition(type)
    this.gravityAcc = 0
    this.lockTimer = 0
    this.lockResets = 0
    this.lowest = Infinity
    this.touched = false
    this.lastKick = -1
    this.pieceCount++
    // block out: no room to spawn
    if (!this.fits(p)) {
      this.active = null
      this.over = true
      return
    }
    this.active = p
    this.refreshLowest()
  }

  private takeNext(): PieceType {
    const t = this.queue.shift() as PieceType
    this.fillQueue()
    return t
  }

  private fillQueue() {
    while (this.queue.length < Math.max(7, this.rules.previews + 1)) this.queue.push(this.bag.next())
  }
}
