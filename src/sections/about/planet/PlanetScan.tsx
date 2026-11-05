import { AnimatePresence, motion } from 'motion/react'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import { type ReadoutRow, planetScan } from '../../../content/aboutContent'
import { contact } from '../../../content/data'
import { prefersReducedMotion } from '../../../scene/pointer'
import { Photo } from '../Photo'
import { PlanetStage, type SpinControl } from './PlanetStage'
import './planet.css'

const SCANNED_KEY = 'tl:planet-scanned'
/** scan timing (seconds): lines start LINE_GAP apart and each types in over TYPE_TIME */
const LINE_START = 0.3
const LINE_GAP = 0.16
const TYPE_TIME = 0.45
const DRAG_RAD_PER_PX = 0.006

const content = planetScan
/** every row gets a reveal step, in reading order; then Classified, then the motto */
const SECTION_START = content.readout.reduce<number[]>(
  (starts, _sec, i) => [...starts, i === 0 ? 0 : starts[i - 1] + content.readout[i - 1].rows.length],
  [],
)
const ROW_COUNT = content.readout.reduce((n, sec) => n + sec.rows.length, 0)
const STEP_CLASSIFIED = ROW_COUNT
const STEP_MOTTO = ROW_COUNT + 1
const STEPS = ROW_COUNT + 2
const TOTAL = LINE_START + (STEPS - 1) * LINE_GAP + TYPE_TIME

const alreadyScanned = () => {
  try {
    return sessionStorage.getItem(SCANNED_KEY) === '1'
  } catch {
    return false
  }
}
const markScanned = () => {
  try {
    sessionStorage.setItem(SCANNED_KEY, '1')
  } catch {
    // storage unavailable: the scan just replays next time
  }
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const typed = (text: string, p: number) => (p >= 1 ? text : text.slice(0, Math.ceil(text.length * p)))

/** Text that types in, while screen readers get the whole string. */
function Typed({ text, p }: { text: string; p: number }) {
  if (p >= 1) return <>{text}</>
  return (
    <>
      <span aria-hidden="true">{typed(text, p)}</span>
      <span className="sr-only">{text}</span>
    </>
  )
}

/** A fact: plain label, the fact (primary), and an optional planet-flavour aside. */
function Row({ row, p, quote = false }: { row: ReadoutRow; p: number; quote?: boolean }) {
  return (
    <div className="readout-row" style={{ opacity: p > 0 ? 1 : 0 }}>
      <dt>{row.label}</dt>
      <dd className={`readout-value${quote ? ' is-quote' : ''}`}>
        {quote && '“'}
        <Typed text={row.value} p={p} />
        {quote && '”'}
      </dd>
      {row.flavor && (
        <dd className="readout-flavor" style={{ opacity: p >= 1 ? 1 : 0 }}>
          {row.flavor}
        </dd>
      )}
    </div>
  )
}

/** Decorative segments (equal widths: never a proportion). */
function Strip({ names, p }: { names: string[]; p: number }) {
  return (
    <div className="readout-strip" aria-hidden="true" style={{ transform: `scaleX(${p})` }}>
      {names.map((n) => (
        <span key={n} title={n} />
      ))}
    </div>
  )
}

/** About → Planet Scan: the site owner as a surveyed planet. */
export function PlanetScan() {
  const [t, setT] = useState(() => (alreadyScanned() || prefersReducedMotion() ? Infinity : 0))
  const scanning = t < TOTAL
  const [activeMoon, setActiveMoon] = useState<number | null>(null)
  const [selectedMoon, setSelectedMoon] = useState<number | null>(null)
  const spinRef = useRef<SpinControl>({ dragging: false, yawVel: content.planet.rotationSpeed, pitch: 0 })
  const drag = useRef({ id: -1, x: 0, y: 0, time: 0 })

  // the scan clock: ~2 s, once per session. Keyed on `scanning`, so skipping
  // (which flips it to false) cancels the loop via cleanup.
  useEffect(() => {
    if (!scanning) return
    const loop = { raf: 0, start: performance.now() }
    const tick = (now: number) => {
      const elapsed = (now - loop.start) / 1000
      if (elapsed >= TOTAL) {
        setT(Infinity)
        markScanned()
        return
      }
      setT(elapsed)
      loop.raf = requestAnimationFrame(tick)
    }
    loop.raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(loop.raf)
  }, [scanning])

  const skip = () => {
    if (!scanning) return
    setT(Infinity)
    markScanned()
  }

  // moon card: Esc closes it before the page (capture phase runs before the page's handler)
  useEffect(() => {
    if (selectedMoon === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      e.preventDefault()
      setSelectedMoon(null)
    }
    const onDown = (e: globalThis.PointerEvent) => {
      const el = e.target as Element | null
      if (el?.closest('.moon-card, [data-moon-control]')) return
      setSelectedMoon(null)
    }
    window.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [selectedMoon])

  // drag to spin, with inertia handled in the render loop
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('[data-moon-control], .moon-card')) return
    skip()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, time: performance.now() }
    spinRef.current.dragging = true
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (e.pointerId !== d.id) return
    const now = performance.now()
    const dt = Math.max((now - d.time) / 1000, 1 / 240)
    const s = spinRef.current
    const v = ((e.clientX - d.x) * DRAG_RAD_PER_PX) / dt
    s.yawVel = s.yawVel * 0.4 + v * 0.6
    s.pitch = Math.max(-0.5, Math.min(0.5, s.pitch + (e.clientY - d.y) * DRAG_RAD_PER_PX))
    Object.assign(d, { x: e.clientX, y: e.clientY, time: now })
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== drag.current.id) return
    drag.current.id = -1
    spinRef.current.dragging = false
  }

  const p = (i: number) => (t === Infinity ? 1 : clamp01((t - (LINE_START + i * LINE_GAP)) / TYPE_TIME))
  const progress = t === Infinity ? 1 : clamp01(t / TOTAL)
  const moon = selectedMoon === null ? null : content.moons[selectedMoon]

  return (
    <div className="planet-scan" onClick={scanning ? skip : undefined}>
      <div
        className="planet-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label="Planet Talus, a procedurally generated world with three moons. Drag to rotate."
      >
        <div className="stage-ring" aria-hidden="true" />
        <PlanetStage
          spinRef={spinRef}
          activeMoon={activeMoon}
          selectedMoon={selectedMoon}
          onActiveMoon={setActiveMoon}
          onSelectMoon={(i) => setSelectedMoon((cur) => (cur === i ? null : i))}
        />
        {scanning && <div className="scan-sweep" aria-hidden="true" />}
        <p className="stage-caption" aria-hidden="true">
          Drag to rotate · select a moon
        </p>
        <AnimatePresence>
          {moon && (
            <motion.div
              key={moon.name}
              className="moon-card"
              role="dialog"
              aria-label={`Moon ${moon.name}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
            >
              <button type="button" className="moon-card-close" onClick={() => setSelectedMoon(null)} aria-label="Close">
                ×
              </button>
              <p className="moon-card-kicker">Moon · {moon.name}</p>
              {moon.image && <Photo key={moon.image} src={moon.image} alt={moon.name} seed={moon.name} className="moon-card-photo" />}
              <p className="moon-card-value">{moon.value}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="readout" aria-label="Survey readout" aria-busy={scanning}>
        <header className="readout-head">
          <span>Survey readout</span>
          <span className={`readout-status${scanning ? ' is-scanning' : ''}`}>
            {scanning ? `Scanning ${Math.round(progress * 100)}%` : 'Scan complete'}
          </span>
        </header>
        <div className="readout-body">
          {content.readout.map((sec, si) => (
            <section key={sec.title ?? `section-${si}`} className="readout-section" aria-label={sec.title}>
              {sec.title && <h3 className="readout-section-title">{sec.title}</h3>}
              {sec.strip && sec.strip.length > 0 && <Strip names={sec.strip} p={p(SECTION_START[si])} />}
              <dl className="readout-rows">
                {sec.rows.map((row, ri) => (
                  <Row key={row.label} row={row} p={p(SECTION_START[si] + ri)} />
                ))}
              </dl>
            </section>
          ))}

          {content.unexplored.length > 0 && (
            <section className="readout-section" aria-label="Classified" style={{ opacity: p(STEP_CLASSIFIED) > 0 ? 1 : 0 }}>
              <h3 className="readout-section-title">
                Classified <span>· hover to reveal</span>
              </h3>
              <ul className="readout-redacted">
                {content.unexplored.map((line) => (
                  <li key={line}>
                    <span className="redacted" tabIndex={0}>
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {content.motto.value && (
            <section className="readout-section" aria-label="Motto">
              <dl className="readout-rows">
                <Row row={{ label: 'Motto', ...content.motto }} p={p(STEP_MOTTO)} quote />
              </dl>
            </section>
          )}
        </div>
        <div className="readout-controls">
          <a className="scan-btn" href={`mailto:${contact.email}`}>
            Open comms
          </a>
          {content.resume && (
            <a className="scan-btn" href={content.resume} target="_blank" rel="noreferrer">
              Resume
            </a>
          )}
        </div>
        {scanning && <p className="readout-skip">Click to skip</p>}
      </section>
    </div>
  )
}
