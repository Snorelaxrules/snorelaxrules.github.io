import type { CSSProperties, KeyboardEvent } from 'react'
import { site } from '../content/site'
import { useIntro } from '../state/introStore'
import { ASPECT, VIEWBOX, cockpitConfig } from './cockpit.config'
import { CHARGE_SEGMENTS, useCharge } from './stacker/charge'

const BARS = [0, 1, 2, 3, 4, 5, 6]
const SLOT_LIGHTS = [0, 1, 2, 3, 4, 5]
const PANEL_LIGHTS = [0, 1, 2, 3, 4, 5, 6, 7, 8]

/** Decorative FTL charge on the right side panel: each line cleared in Cargo Loader lights a segment. */
function ChargeMeter() {
  const lines = useCharge((s) => s.lines)
  const lit = Math.min(lines, CHARGE_SEGMENTS)
  const full = lit === CHARGE_SEGMENTS
  return (
    <g className={`charge${full ? ' is-full' : ''}`}>
      <text x="1450" y="734" textAnchor="middle" className="ci-label charge-label" fill="var(--accent)" fillOpacity="0.5">
        CHARGE
      </text>
      {Array.from({ length: CHARGE_SEGMENTS }, (_, i) => (
        <rect
          key={i}
          x={1408 + (i % 2) * 44}
          y={800 - Math.floor(i / 2) * 13}
          width="40"
          height="8"
          rx="2"
          fill={i < lit ? 'var(--accent-warm)' : 'var(--accent)'}
          fillOpacity={i < lit ? 0.95 : 0.1}
          className="charge-seg"
        />
      ))}
    </g>
  )
}

/** Animated readouts plus the start lever, in the same coordinate space as the frame. */
export function CockpitInstruments() {
  const phase = useIntro((s) => s.phase)
  const engage = useIntro((s) => s.engage)
  const engaged = phase !== 'cockpit'

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      engage()
    }
  }

  return (
    <svg className="cockpit-layer cockpit-instruments" viewBox={VIEWBOX} preserveAspectRatio={ASPECT}>
      <defs>
        <linearGradient id="ci-knob" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd6a8" />
          <stop offset="0.5" stopColor="var(--accent-warm)" />
          <stop offset="1" stopColor="#d9792e" />
        </linearGradient>
        <radialGradient id="ci-knob-glow">
          <stop offset="0" stopColor="var(--accent-warm)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--accent-warm)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ci-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {cockpitConfig.instruments && (
        <g aria-hidden="true">
          {/* HUD projected on the center pane */}
          <g className="hud" fill="var(--accent)" stroke="var(--accent)">
            <text x="800" y="150" textAnchor="middle" className="ci-label" fillOpacity="0.55" stroke="none">
              DESTINATION
            </text>
            <text x="800" y="180" textAnchor="middle" className="ci-title" stroke="none">
              {site.name.toUpperCase()}
            </text>
            <g fill="none" strokeOpacity="0.45">
              <circle cx="800" cy="340" r="34" />
              <path d="M800 294v-12 M800 386v12 M754 340h-12 M846 340h12" />
              <path d="M720 300v-14h18 M880 300v-14h-18 M720 380v14h18 M880 380v14h-18" strokeOpacity="0.3" />
            </g>
            <circle cx="800" cy="340" r="1.8" stroke="none" />
            <text x="800" y="438" textAnchor="middle" className="ci-label hud-blink" stroke="none">
              {engaged ? 'JUMP IN PROGRESS' : 'HYPERDRIVE READY'}
            </text>
          </g>

          {/* overhead strip */}
          <g fill="var(--accent)">
            {PANEL_LIGHTS.map((i) => (
              <rect key={i} x={694 + i * 24} y="38" width="14" height="4" rx="2" className="blink" style={{ '--d': `${(i * 0.53) % 1.7}s` } as CSSProperties} />
            ))}
          </g>

          {/* left console: radar + sensor bars */}
          <text x="266" y="700" className="ci-label" fill="var(--accent)" fillOpacity="0.5">SENSORS</text>
          <g fill="none" stroke="var(--accent)" strokeOpacity="0.25">
            <circle cx="335" cy="770" r="56" />
            <circle cx="335" cy="770" r="36" />
            <circle cx="335" cy="770" r="16" />
            <path d="M279 770h112 M335 714v112" />
          </g>
          <g className="radar-sweep">
            <path d="M335 770 L335 714 A56 56 0 0 1 375 731 Z" fill="url(#ci-sweep)" />
            <path d="M335 770 L375 731" stroke="var(--accent)" strokeOpacity="0.8" />
          </g>
          <circle cx="357" cy="744" r="2.5" fill="var(--accent)" className="blink" style={{ '--d': '0.2s' } as CSSProperties} />
          <circle cx="310" cy="796" r="2" fill="var(--accent-warm)" className="blink" style={{ '--d': '0.9s' } as CSSProperties} />
          <g fill="var(--accent)" fillOpacity="0.55">
            {BARS.map((i) => (
              <rect key={i} x={420 + i * 21} y="738" width="12" height="90" rx="2" className="bar" style={{ '--i': i } as CSSProperties} />
            ))}
          </g>

          {/* right console: system readouts (the game screen takes this spot when enabled) */}
          {!cockpitConfig.game && (
            <>
              <g className="ci-mono" fill="var(--accent)">
                <text x="1036" y="700" className="ci-label" fillOpacity="0.5">SYSTEMS</text>
                <text x="1040" y="736" fillOpacity="0.6">FTL CORE</text>
                <text x="1330" y="736" textAnchor="end">{engaged ? '100%' : '98%'}</text>
                <text x="1040" y="768" fillOpacity="0.6">NAV</text>
                <text x="1330" y="768" textAnchor="end">{engaged ? 'ENGAGED' : 'LOCKED'}</text>
                <text x="1040" y="800" fillOpacity="0.6">HULL</text>
                <text x="1330" y="800" textAnchor="end">NOMINAL</text>
              </g>
              <rect x="1040" y="818" width="290" height="6" rx="3" fill="var(--accent)" fillOpacity="0.12" />
              <rect x="1040" y="818" width={engaged ? 290 : 284} height="6" rx="3" fill="var(--accent-warm)" className="core-fill" />
            </>
          )}

          {/* side panels */}
          {cockpitConfig.game && <ChargeMeter />}
          {(cockpitConfig.game ? [110] : [110, 1410]).map((x0) =>
            PANEL_LIGHTS.map((i) => (
              <circle
                key={`${x0}-${i}`}
                cx={x0 + 20 + (i % 3) * 30}
                cy={740 + Math.floor(i / 3) * 28}
                r="5"
                fill={i % 4 === 0 ? 'var(--accent-warm)' : 'var(--accent)'}
                className="blink"
                style={{ '--d': `${((i * 7 + x0) % 23) / 10}s` } as CSSProperties}
              />
            )),
          )}
        </g>
      )}

      {/* start control */}
      <g
        className={`lever${engaged ? ' is-engaged' : ''}`}
        role="button"
        tabIndex={engaged ? -1 : 0}
        aria-label="Engage hyperdrive"
        aria-disabled={engaged}
        onClick={engage}
        onKeyDown={onKeyDown}
      >
        <rect x="690" y="626" width="220" height="250" rx="18" fill="transparent" />
        <rect x="792" y="660" width="16" height="176" rx="8" fill="#02040a" stroke="var(--accent)" strokeOpacity="0.2" />
        {SLOT_LIGHTS.map((i) =>
          [770, 822].map((x) => (
            <rect key={`${x}-${i}`} x={x} y={668 + i * 27} width="8" height="14" rx="2" className="slot-light" style={{ '--i': 5 - i } as CSSProperties} />
          )),
        )}
        <g className="knob">
          <ellipse cx="800" cy="690" rx="130" ry="52" fill="url(#ci-knob-glow)" className="knob-glow" />
          <rect x="716" y="668" width="168" height="44" rx="12" fill="url(#ci-knob)" className="knob-body" />
          <path d="M730 680v20 M738 680v20 M862 680v20 M870 680v20" stroke="#7a3c0c" strokeOpacity="0.35" strokeWidth="2" />
          <text x="803" y="697" textAnchor="middle" className="knob-label">ENGAGE</text>
        </g>
        <text x="800" y="860" textAnchor="middle" className="ci-label" fill="var(--accent)" fillOpacity="0.55">
          HYPERDRIVE
        </text>
      </g>
    </svg>
  )
}
