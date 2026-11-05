/** Canvas 2D renderer for Cargo Loader. Reads a Game, draws; owns no state. */
import { THEME } from './config'
import { type Game, VISIBLE, WIDTH, pieceCells } from './engine'
import { PIECES, type PieceType, SHAPES } from './pieces'

/** rows of the hidden buffer drawn above the field, so fresh spawns are visible */
export const ROWS_ABOVE = 2
export const BOARD_ROWS = VISIBLE + ROWS_ABOVE

const colorOf = (code: number) => THEME.pieces[PIECES[code - 1]] ?? THEME.dead

function block(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  const x0 = Math.round(x)
  const y0 = Math.round(y)
  const w = Math.round(x + s) - x0
  const h = Math.round(y + s) - y0
  const inset = Math.max(1, Math.round(s * 0.08))
  ctx.fillStyle = color
  ctx.globalAlpha = 0.9
  ctx.fillRect(x0, y0, w, h)
  // bevel: lit top-left, shaded bottom-right, so stacked cells read as crates
  ctx.globalAlpha = 0.28
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x0, y0, w, inset)
  ctx.fillRect(x0, y0, inset, h)
  ctx.globalAlpha = 0.35
  ctx.fillStyle = '#000000'
  ctx.fillRect(x0, y0 + h - inset, w, inset)
  ctx.fillRect(x0 + w - inset, y0, inset, h)
  ctx.globalAlpha = 1
}

function ghostBlock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  const lw = Math.max(1, Math.round(s * 0.09))
  ctx.globalAlpha = 0.14
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(s), Math.round(s))
  ctx.globalAlpha = 0.6
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.strokeRect(Math.round(x) + lw / 2, Math.round(y) + lw / 2, Math.round(s) - lw, Math.round(s) - lw)
  ctx.globalAlpha = 1
}

export function drawBoard(canvas: HTMLCanvasElement, game: Game | null) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height
  const s = W / WIDTH
  const top = ROWS_ABOVE * s
  /** canvas y of the top edge of board row `row` (row 0 = floor) */
  const yOf = (row: number) => (BOARD_ROWS - 1 - row) * s

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = THEME.well
  ctx.fillRect(0, top, W, H - top)

  ctx.strokeStyle = THEME.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 1; x < WIDTH; x++) {
    const px = Math.round(x * s) + 0.5
    ctx.moveTo(px, top)
    ctx.lineTo(px, H)
  }
  for (let y = 1; y < VISIBLE; y++) {
    const py = Math.round(top + y * s) + 0.5
    ctx.moveTo(0, py)
    ctx.lineTo(W, py)
  }
  ctx.stroke()

  // the top of the field: a faint dashed line where the buffer begins
  ctx.strokeStyle = THEME.wellEdge
  ctx.setLineDash([Math.max(2, s * 0.3), Math.max(2, s * 0.3)])
  ctx.beginPath()
  ctx.moveTo(0, Math.round(top) + 0.5)
  ctx.lineTo(W, Math.round(top) + 0.5)
  ctx.stroke()
  ctx.setLineDash([])

  if (!game) return
  const dead = game.over
  for (let y = 0; y < BOARD_ROWS; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const v = game.get(x, y)
      if (v) block(ctx, x * s, yOf(y), s, dead ? THEME.dead : colorOf(v))
    }
  }

  const p = game.active
  if (!p || dead) return
  const color = THEME.pieces[p.type]
  const ghost = game.ghost()
  if (ghost && ghost.y !== p.y) {
    for (const [x, y] of pieceCells(ghost)) if (y < BOARD_ROWS) ghostBlock(ctx, x * s, yOf(y), s, color)
  }
  for (const [x, y] of pieceCells(p)) if (y < BOARD_ROWS) block(ctx, x * s, yOf(y), s, color)
}

/** One small piece centred in a w×h box at (ox, oy). */
function miniPiece(ctx: CanvasRenderingContext2D, type: PieceType, ox: number, oy: number, w: number, h: number, s: number, color: string) {
  const cells = SHAPES[type][0]
  const xs = cells.map(([c]) => c)
  const ys = cells.map(([, r]) => r)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const pw = (Math.max(...xs) - minX + 1) * s
  const ph = (Math.max(...ys) - minY + 1) * s
  const x0 = ox + (w - pw) / 2
  const y0 = oy + (h - ph) / 2
  for (const [c, r] of cells) block(ctx, x0 + (c - minX) * s, y0 + (r - minY) * s, s, color)
}

/** Vertical list of pieces in equal slots (hold uses one slot, next uses five). */
export function drawPieces(canvas: HTMLCanvasElement, types: (PieceType | null)[], slots: number, dim = false) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const W = canvas.width
  const H = canvas.height
  ctx.clearRect(0, 0, W, H)
  const slotH = H / slots
  const s = Math.min(W / 4.6, slotH / 2.8)
  types.forEach((t, i) => {
    if (!t) return
    miniPiece(ctx, t, 0, i * slotH, W, slotH, s, dim ? THEME.dead : THEME.pieces[t])
  })
}
