import { describe, expect, it } from 'vitest'
import { Bag, Game, WIDTH, pieceCells, seededRandom, spawnPosition } from './engine'
import { InputController } from './input'
import { PIECES, type PieceType } from './pieces'

/** Fill the board from strings written top-down; the last string is row 0. '#' = block. */
function setRows(game: Game, rows: string[]) {
  game.board.fill(0)
  rows.forEach((row, i) => {
    const y = rows.length - 1 - i
    for (let x = 0; x < WIDTH; x++) if (row[x] === '#') game.set(x, y, 8)
  })
}

const sorted = (cells: [number, number][]) => [...cells].sort((a, b) => a[0] - b[0] || a[1] - b[1])

function gameWith(type: PieceType, rows: string[] = []) {
  const game = new Game({ random: seededRandom(1) })
  setRows(game, rows)
  game.active = spawnPosition(type)
  return game
}

describe('SRS+ kicks', () => {
  it('T-spin triple: 0 → L takes the fifth kick (+1, -2) into the slot and clears three lines', () => {
    const game = gameWith('T', [
      '..#.......', // row 4: overhang
      '...#######', // row 3
      '##.#######', // row 2
      '#..#######', // row 1
      '##.#######', // row 0
    ])
    game.active = { type: 'T', rot: 0, x: 0, y: 4 }
    expect(game.fits(game.active)).toBe(true)

    expect(game.rotate(-1)).toBe(true)
    expect(game.lastKick).toBe(4)
    expect(game.active).toMatchObject({ rot: 3, x: 1, y: 2 })
    expect(sorted(pieceCells(game.active))).toEqual([[1, 1], [2, 0], [2, 1], [2, 2]])

    game.hardDrop()
    expect(game.lines).toBe(3)
    // rows 3 and 4 fell into rows 0 and 1
    expect(game.get(2, 1)).toBeTruthy()
    expect(game.get(3, 0)).toBeTruthy()
    expect(game.get(0, 0)).toBe(0)
  })

  it('I piece 0 → R uses the SRS+ second test (+1, 0), not SRS (-2, 0)', () => {
    const game = gameWith('I', ['.....#....'])
    game.active = { type: 'I', rot: 0, x: 3, y: 3 }
    expect(game.rotate(1)).toBe(true)
    expect(game.lastKick).toBe(1)
    expect(game.active).toMatchObject({ rot: 1, x: 4, y: 3 })
    expect(sorted(pieceCells(game.active))).toEqual([[6, 0], [6, 1], [6, 2], [6, 3]])
  })

  it('I piece kicks off the right wall when rotating R → 0', () => {
    const game = gameWith('I')
    // vertical I hugging the right wall (column 9)
    game.active = { type: 'I', rot: 1, x: 7, y: 5 }
    expect(sorted(pieceCells(game.active)).map(([x]) => x)).toEqual([9, 9, 9, 9])
    expect(game.rotate(-1)).toBe(true)
    // in place would poke through the wall; the first kick (-1, 0) fits
    expect(game.lastKick).toBe(1)
    expect(game.active).toMatchObject({ rot: 0, x: 6, y: 5 })
    expect(Math.max(...pieceCells(game.active).map(([x]) => x))).toBe(9)
  })

  it('O piece never kicks', () => {
    const game = gameWith('O')
    const before = { ...game.active! }
    expect(game.rotate(1)).toBe(true)
    expect(game.active).toMatchObject({ x: before.x, y: before.y, rot: 1 })
  })
})

describe('180 rotation', () => {
  it('rotates in place when there is room', () => {
    const game = gameWith('T')
    const { x, y } = game.active!
    expect(game.rotate(2)).toBe(true)
    expect(game.active).toMatchObject({ rot: 2, x, y })
    expect(game.lastKick).toBe(0)
  })

  it('kicks up one row when flipping a T on the floor', () => {
    const game = gameWith('T')
    game.active = { type: 'T', rot: 0, x: 3, y: 1 }
    expect(game.grounded).toBe(true)
    expect(game.rotate(2)).toBe(true)
    expect(game.active).toMatchObject({ rot: 2, x: 3, y: 2 })
    expect(game.lastKick).toBe(1)
  })

  it('R → L uses the 180 table', () => {
    const game = gameWith('T')
    game.active = { type: 'T', rot: 1, x: -1, y: 3 } // pointing right against the left wall
    expect(game.fits(game.active)).toBe(true)
    expect(game.rotate(2)).toBe(true)
    // in place pokes through the wall; the 180 table's first test (+1, 0) fits
    expect(game.lastKick).toBe(1)
    expect(game.active).toMatchObject({ rot: 3, x: 0, y: 3 })
  })
})

describe('line clears', () => {
  it('clears a full row and drops everything above it', () => {
    const game = gameWith('I', [
      '#.........', // row 1: marker
      '######....', // row 0
    ])
    game.slide(1)
    expect(sorted(pieceCells(game.active!)).map(([x]) => x)).toEqual([6, 7, 8, 9])
    game.hardDrop()
    expect(game.lines).toBe(1)
    expect(game.lastClear).toBe(1)
    expect(game.get(0, 0)).toBeTruthy()
    for (let x = 1; x < WIDTH; x++) expect(game.get(x, 0)).toBe(0)
  })

  it('levels up every 10 lines and gravity rises from 1 cell/s', () => {
    const game = new Game({ random: seededRandom(2) })
    expect(game.level).toBe(1)
    expect(game.gravity).toBeCloseTo(1)
    game.lines = 10
    expect(game.level).toBe(2)
    expect(game.gravity).toBeGreaterThan(1)
    game.lines = 500
    expect(game.gravity).toBe(game.rules.maxGravity)
  })
})

describe('hold', () => {
  it('stores the piece, takes the next one, and is one use per piece', () => {
    const game = new Game({ random: seededRandom(3) })
    const first = game.active!.type
    const second = game.queue[0]
    expect(game.holdPiece()).toBe(true)
    expect(game.hold).toBe(first)
    expect(game.active!.type).toBe(second)
    expect(game.holdPiece()).toBe(false)
    expect(game.active!.type).toBe(second)

    // locking re-enables hold; swapping brings the held piece back at spawn
    game.hardDrop()
    expect(game.holdUsed).toBe(false)
    const third = game.active!.type
    expect(game.holdPiece()).toBe(true)
    expect(game.active).toEqual(spawnPosition(first))
    expect(game.hold).toBe(third)
  })
})

describe('7-bag', () => {
  it('deals every piece once per bag of seven', () => {
    const bag = new Bag(seededRandom(42))
    for (let b = 0; b < 20; b++) {
      const seven = Array.from({ length: 7 }, () => bag.next())
      expect([...seven].sort()).toEqual([...PIECES].sort())
    }
  })

  it('the game queue shows five and stays a bag sequence', () => {
    const game = new Game({ random: seededRandom(7) })
    expect(game.preview()).toHaveLength(5)
    const dealt = [game.active!.type]
    for (let i = 0; i < 13; i++) {
      game.board.fill(0)
      game.hardDrop()
      if (game.over) break
      dealt.push(game.active!.type)
    }
    expect([...dealt.slice(0, 7)].sort()).toEqual([...PIECES].sort())
    expect([...dealt.slice(7, 14)].sort()).toEqual([...PIECES].sort())
  })
})

describe('lock delay and game over', () => {
  it('locks 0.5 s after touching down; a move resets the timer', () => {
    const game = gameWith('T')
    game.softDrop()
    const id = game.pieceCount
    game.tick(400)
    expect(game.pieceCount).toBe(id)
    game.moveX(-1)
    game.tick(400)
    expect(game.pieceCount).toBe(id)
    game.tick(100)
    expect(game.pieceCount).toBe(id + 1)
  })

  it('locks immediately once 15 resets are spent', () => {
    const game = gameWith('T')
    game.softDrop()
    const id = game.pieceCount
    for (let i = 0; i < 15; i++) {
      game.tick(1)
      expect(game.pieceCount).toBe(id)
      expect(game.moveX(i % 2 ? 1 : -1)).toBe(true)
    }
    game.tick(1)
    expect(game.pieceCount).toBe(id + 1)
  })

  it('lock out: a piece resting entirely above the field ends the game', () => {
    const game = gameWith('T', Array.from({ length: 20 }, () => '###.######'))
    game.hardDrop()
    expect(game.over).toBe(true)
  })

  it('block out: no room at the spawn point ends the game', () => {
    const game = gameWith('T')
    for (const y of [20, 21]) for (let x = 3; x < 7; x++) game.set(x, y, 8)
    game.holdPiece()
    expect(game.over).toBe(true)
    expect(game.active).toBeNull()
  })
})

describe('handling', () => {
  it('DAS 75 ms, ARR 0: taps one cell, then slides to the wall once charged', () => {
    const game = gameWith('T')
    const input = new InputController()
    input.press('moveRight', 0, game)
    expect(game.active!.x).toBe(4)
    input.update(74, game)
    expect(game.active!.x).toBe(4)
    input.update(75, game)
    expect(game.active!.x).toBe(7)
  })

  it('newest direction wins; releasing it falls back to the other and re-charges', () => {
    const game = gameWith('T')
    const input = new InputController()
    input.press('moveLeft', 0, game)
    input.press('moveRight', 10, game)
    input.update(84, game)
    expect(game.active!.x).toBe(3)
    input.update(85, game)
    expect(game.active!.x).toBe(7)
    input.release('moveRight', 100)
    input.update(174, game)
    expect(game.active!.x).toBe(7)
    input.update(175, game)
    expect(game.active!.x).toBe(0)
  })

  it('DAS charge survives rotation and new pieces (DCD 0)', () => {
    const game = gameWith('T')
    const input = new InputController()
    input.press('moveLeft', 0, game)
    input.update(80, game)
    expect(game.active!.x).toBe(0)
    input.press('rotateCW', 90, game)
    expect(Math.min(...pieceCells(game.active!).map(([x]) => x))).toBe(0)
    input.press('hardDrop', 100, game)
    expect(Math.min(...pieceCells(game.active!).map(([x]) => x))).toBe(0)
  })

  it('infinite soft drop reaches the floor without locking', () => {
    const game = gameWith('T')
    const input = new InputController()
    const id = game.pieceCount
    input.press('softDrop', 0, game)
    expect(game.grounded).toBe(true)
    expect(game.pieceCount).toBe(id)
    game.tick(499)
    expect(game.pieceCount).toBe(id)
    game.tick(1)
    expect(game.pieceCount).toBe(id + 1)
  })
})
