import { THEME } from './config'
import { PIECES, SHAPES } from './pieces'

/** The seven pieces in a row, in their colours: menu decoration. */
export function PieceStrip() {
  return (
    <div className="stacker-strip" aria-hidden="true">
      {PIECES.map((type) => {
        const cells = SHAPES[type][0]
        const xs = cells.map(([x]) => x)
        const ys = cells.map(([, y]) => y)
        const x0 = Math.min(...xs)
        const y0 = Math.min(...ys)
        const w = Math.max(...xs) - x0 + 1
        const h = Math.max(...ys) - y0 + 1
        return (
          <svg key={type} viewBox={`0 0 ${w} ${h}`} style={{ width: `${w}em`, height: `${h}em` }}>
            {cells.map(([x, y]) => (
              <rect
                key={`${x}-${y}`}
                x={x - x0 + 0.06}
                y={y - y0 + 0.06}
                width={0.88}
                height={0.88}
                rx={0.12}
                fill={THEME.pieces[type]}
              />
            ))}
          </svg>
        )
      })}
    </div>
  )
}
