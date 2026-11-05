import { ASPECT, PANES, VIEWBOX, cockpitConfig } from './cockpit.config'

const DASH_TOP = 'M0 650 Q800 510 1600 650'
/** stacked strokes = soft inner shadow where the glass meets the frame */
const INNER_SHADOW = [150, 120, 94, 72, 54, 38, 24, 12]
const PANE_CENTERS = [
  [300, 380],
  [800, 340],
  [1300, 380],
]

/** Static cockpit structure: hull, window struts, dashboard. Swappable for a PNG. */
export function CockpitFrame() {
  if (cockpitConfig.frameImage) {
    return <img className="cockpit-layer cockpit-image" src={cockpitConfig.frameImage} alt="" />
  }

  const rivets = [0.18, 0.36, 0.54, 0.72, 0.9].flatMap((t) => [
    [499 - 65 * t, 94 + 494 * t],
    [1101 + 65 * t, 94 + 494 * t],
  ])

  return (
    <svg className="cockpit-layer" viewBox={VIEWBOX} preserveAspectRatio={ASPECT} aria-hidden="true">
      <defs>
        <linearGradient id="cf-hull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1324" />
          <stop offset="0.6" stopColor="#070b16" />
          <stop offset="1" stopColor="#04070e" />
        </linearGradient>
        <linearGradient id="cf-dash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#121c36" />
          <stop offset="0.35" stopColor="#0a1124" />
          <stop offset="1" stopColor="#03060c" />
        </linearGradient>
        <linearGradient id="cf-glare" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cf-tint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7ab8ff" stopOpacity="0.04" />
          <stop offset="0.7" stopColor="#2a4a8a" stopOpacity="0.025" />
          <stop offset="1" stopColor="#ffb36b" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="cf-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4f78" />
          <stop offset="0.45" stopColor="#141d33" />
          <stop offset="1" stopColor="#070b15" />
        </linearGradient>
        <linearGradient id="cf-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.42" stopColor="#ffffff" stopOpacity="0.035" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.07" />
          <stop offset="0.58" stopColor="#ffffff" stopOpacity="0.035" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="cf-reflect" cx="0.5" cy="1" r="0.7">
          <stop offset="0" stopColor="var(--accent-warm)" stopOpacity="0.12" />
          <stop offset="1" stopColor="var(--accent-warm)" stopOpacity="0" />
        </radialGradient>
        {PANES.map((d, i) => (
          <clipPath key={d} id={`cf-pane-${i}`}>
            <path d={d} />
          </clipPath>
        ))}
        <linearGradient id="cf-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={`M0 0H1600V900H0Z ${PANES.join(' ')}`} fill="url(#cf-hull)" fillRule="evenodd" />
      {PANES.map((d, i) => {
        const [cx, cy] = PANE_CENTERS[i]
        return (
          <g key={d}>
            {/* the glass: tint, thickness shadow at the edges, sheen, glare */}
            <g clipPath={`url(#cf-pane-${i})`}>
              <path d={d} fill="url(#cf-tint)" />
              {INNER_SHADOW.map((w) => (
                <path key={w} d={d} fill="none" stroke="#01030a" strokeOpacity="0.11" strokeWidth={w} />
              ))}
              <rect
                x={cx - 300}
                y={-300}
                width="170"
                height="1400"
                fill="url(#cf-sheen)"
                transform={`rotate(24 ${cx} ${cy})`}
              />
              <path d={d} fill="url(#cf-glare)" />
              {i === 1 && <ellipse cx="800" cy="610" rx="320" ry="100" fill="url(#cf-reflect)" />}
            </g>
            {/* the frame: bevelled metal rim, gasket, hairline */}
            <path d={d} fill="none" stroke="url(#cf-rim)" strokeWidth="18" />
            <path d={d} fill="none" stroke="#000" strokeOpacity="0.65" strokeWidth="5" />
            <path d={d} fill="none" stroke="var(--accent)" strokeOpacity="0.2" strokeWidth="1.2" />
          </g>
        )
      })}
      {rivets.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="#1a2540" stroke="var(--accent)" strokeOpacity="0.15" />
      ))}

      <path d={`${DASH_TOP} L1600 900 L0 900Z`} fill="url(#cf-dash)" />
      <path d={DASH_TOP} fill="none" stroke="url(#cf-edge)" strokeWidth="2" />
      <path d="M0 700 Q800 570 1600 700" fill="none" stroke="#000" strokeOpacity="0.35" />

      <g fill="#060a15" stroke="var(--accent)" strokeOpacity="0.14">
        <rect x="250" y="676" width="330" height="168" rx="14" />
        {cockpitConfig.game ? (
          // housing for the game screen, standing slightly proud of the dash
          <rect x="1010" y="589" width="350" height="296" rx="20" />
        ) : (
          <rect x="1020" y="676" width="330" height="168" rx="14" />
        )}
        <rect x="690" y="626" width="220" height="250" rx="18" />
        <rect x="90" y="712" width="120" height="110" rx="10" />
        <rect x="1390" y="712" width="120" height="110" rx="10" />
      </g>
    </svg>
  )
}
