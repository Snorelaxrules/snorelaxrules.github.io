import { AnimatePresence, motion } from 'motion/react'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import { type ReadoutLine, planetScan } from '../../../content/aboutContent'
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
/** readout lines + unexplored + transmission, in reveal order */
const STEPS = content.readout.length + 2
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

function Line({ line, p }: { line: ReadoutLine; p: number }) {
  if ('composition' in line) {
    return (
      <div className="readout-row" style={{ opacity: p > 0 ? 1 : 0 }}>
        <dt>{line.label}</dt>
        <dd>
          <div className="composition-bar" aria-hidden="true">
            {line.composition.map((c) => (
              <span key={c.name} style={{ width: `${c.percent * p}%` }} />
            ))}
          </div>
          <ul className="composition-legend">
            {line.composition.map((c) => (
              <li key={c.name}>
                <i aria-hidden="true" />
                <strong>{c.name}</strong> <span className="readout-num">{Math.round(c.percent * p)}%</span>
                {c.note && <span className="readout-note"> · {c.note}</span>}
              </li>
            ))}
          </ul>
        </dd>
      </div>
    )
  }
  return (
    <div className="readout-row" style={{ opacity: p > 0 ? 1 : 0 }}>
      <dt>{line.label}</dt>
      <dd>
        <Typed text={line.value} p={p} />
        {line.note && (
          <span className="readout-note" style={{ opacity: p >= 1 ? 1 : 0 }}>
            {' '}
            · {line.note}
          </span>
        )}
      </dd>
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
  const nUnexplored = content.readout.length
  const nTransmission = nUnexplored + 1

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
        <dl className="readout-lines">
          {content.readout.map((line, i) => (
            <Line key={line.label} line={line} p={p(i)} />
          ))}
          {content.unexplored.length > 0 && (
            <div className="readout-row" style={{ opacity: p(nUnexplored) > 0 ? 1 : 0 }}>
              <dt>Unexplored regions</dt>
              <dd>
                <ul className="readout-redacted">
                  {content.unexplored.map((line) => (
                    <li key={line}>
                      <span className="redacted" tabIndex={0}>
                        {line}
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          <div className="readout-row" style={{ opacity: p(nTransmission) > 0 ? 1 : 0 }}>
            <dt>Surface transmission</dt>
            <dd className="readout-quote">
              “<Typed text={content.transmission} p={p(nTransmission)} />”
            </dd>
          </div>
        </dl>
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
