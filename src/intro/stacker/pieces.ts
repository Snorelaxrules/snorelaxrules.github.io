/**
 * Piece shapes and SRS+ kick tables (TETR.IO's rotation system).
 * Pure data, no DOM.
 */

export const PIECES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'] as const
export type PieceType = (typeof PIECES)[number]
export type Rotation = 0 | 1 | 2 | 3

/** Spawn orientation, rows top to bottom inside the bounding box. */
const SPAWN_SHAPES: Record<PieceType, string[]> = {
  I: ['....', 'IIII', '....', '....'],
  O: ['OO', 'OO'],
  T: ['.T.', 'TTT', '...'],
  S: ['.SS', 'SS.', '...'],
  Z: ['ZZ.', '.ZZ', '...'],
  J: ['J..', 'JJJ', '...'],
  L: ['..L', 'LLL', '...'],
}

/** [column, row-from-top] of each filled cell. */
export type BoxCell = readonly [number, number]

function rotateCW(rows: string[]): string[] {
  const n = rows.length
  return rows.map((_, r) => rows.map((_row, c) => rows[n - 1 - c][r]).join(''))
}

function cellsOf(rows: string[]): BoxCell[] {
  const out: BoxCell[] = []
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] !== '.') out.push([c, r])
  })
  return out
}

/** SHAPES[type][rotation] → cells. Rotations come from rotating the bounding box clockwise (0 → R → 2 → L). */
export const SHAPES: Record<PieceType, BoxCell[][]> = Object.fromEntries(
  PIECES.map((type) => {
    const states = [SPAWN_SHAPES[type]]
    for (let i = 1; i < 4; i++) states.push(rotateCW(states[i - 1]))
    return [type, states.map(cellsOf)]
  }),
) as Record<PieceType, BoxCell[][]>

export const BOX_SIZE: Record<PieceType, number> = Object.fromEntries(
  PIECES.map((t) => [t, SPAWN_SHAPES[t].length]),
) as Record<PieceType, number>

/**
 * SRS+ kicks, written as TETR.IO lists them: [dx, dy] with +y DOWN, keyed
 * "fromTo" (0 spawn, 1 R, 2 180, 3 L). The (0, 0) test is implied first.
 * Same values as TETR.IO's engine, including its 180 table and the
 * symmetric SRS+ I kicks.
 */
type KickTable = Record<string, readonly (readonly [number, number])[]>

const KICKS: KickTable = {
  '01': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '10': [[1, 0], [1, 1], [0, -2], [1, -2]],
  '12': [[1, 0], [1, 1], [0, -2], [1, -2]],
  '21': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '23': [[1, 0], [1, -1], [0, 2], [1, 2]],
  '32': [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '30': [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '03': [[1, 0], [1, -1], [0, 2], [1, 2]],
  '02': [[0, -1], [1, -1], [-1, -1], [1, 0], [-1, 0]],
  '13': [[1, 0], [1, -2], [1, -1], [0, -2], [0, -1]],
  '20': [[0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]],
  '31': [[-1, 0], [-1, -2], [-1, -1], [0, -2], [0, -1]],
}

const I_KICKS: KickTable = {
  '01': [[1, 0], [-2, 0], [-2, 1], [1, -2]],
  '10': [[-1, 0], [2, 0], [-1, 2], [2, -1]],
  '12': [[-1, 0], [2, 0], [-1, -2], [2, 1]],
  '21': [[-2, 0], [1, 0], [-2, -1], [1, 2]],
  '23': [[2, 0], [-1, 0], [2, -1], [-1, 2]],
  '32': [[1, 0], [-2, 0], [1, -2], [-2, 1]],
  '30': [[1, 0], [-2, 0], [1, 2], [-2, -1]],
  '03': [[-1, 0], [2, 0], [2, 1], [-1, -2]],
  '02': [[0, -1]],
  '13': [[1, 0]],
  '20': [[0, 1]],
  '31': [[-1, 0]],
}

/** Kick tests for a rotation, in order, as [dx, dy] with +y UP (board coordinates). */
export function kickTests(type: PieceType, from: Rotation, to: Rotation): [number, number][] {
  if (type === 'O') return [[0, 0]]
  const table = type === 'I' ? I_KICKS : KICKS
  return [[0, 0], ...(table[`${from}${to}`] ?? []).map(([x, y]): [number, number] => [x, -y])]
}
