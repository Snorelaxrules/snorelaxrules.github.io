import { motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { waypoints } from '../../content/aboutContent'
import { Photo } from './Photo'

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))

/** Horizontal timeline: one waypoint per slide, with a ship gliding along a tracker. */
export function FlightPath() {
  const [index, setIndex] = useState(0)
  const [heading, setHeading] = useState<1 | -1>(1)
  const indexRef = useRef(index)
  const n = waypoints.length

  const go = (i: number) => {
    const next = Math.max(0, Math.min(n - 1, i))
    if (next === indexRef.current) return
    setHeading(next > indexRef.current ? 1 : -1)
    indexRef.current = next
    setIndex(next)
  }
  const goRef = useRef(go)
  useLayoutEffect(() => {
    goRef.current = go
  })

  // ← / → anywhere on the page (except while focus is in the tab bar or a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (e.target instanceof Element && e.target.closest('[role="tablist"]')) return
      if (e.key === 'ArrowRight') goRef.current(indexRef.current + 1)
      else if (e.key === 'ArrowLeft') goRef.current(indexRef.current - 1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (n === 0) return <p className="muted">No waypoints yet.</p>

  const pct = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100)

  return (
    <div className="flightpath">
      <div className="fp-stage">
        <button type="button" className="fp-nav" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous waypoint">
          ←
        </button>
        <div className="fp-viewport">
          <motion.div
            className="fp-track"
            animate={{ x: `${-index * 100}%` }}
            transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          >
            {waypoints.map((w, i) => (
              <section
                key={`${w.title}-${i}`}
                className="fp-slide"
                role="group"
                aria-roledescription="slide"
                aria-label={`Waypoint ${i + 1} of ${n}`}
                aria-hidden={i !== index}
                inert={i !== index}
              >
                <Photo key={w.photo} src={w.photo} alt={w.title} seed={`${w.title}${i}`} className="fp-photo" />
                <div className="fp-copy">
                  <p className="fp-date">
                    <span>Waypoint {String(i + 1).padStart(2, '0')}</span> · {w.date}
                  </p>
                  <h2>{w.title}</h2>
                  <p>{w.text}</p>
                </div>
              </section>
            ))}
          </motion.div>
        </div>
        <button type="button" className="fp-nav" onClick={() => go(index + 1)} disabled={index === n - 1} aria-label="Next waypoint">
          →
        </button>
      </div>

      <div className="fp-tracker">
        <div className="fp-rail">
          <div className="fp-line" />
          <div className="fp-progress" style={{ width: `${pct(index)}%` }} />
          {waypoints.map((w, i) => (
            <button
              key={`${w.title}-${i}`}
              type="button"
              className={`fp-dot${i <= index ? ' is-lit' : ''}${i === index ? ' is-current' : ''}`}
              style={{ left: `${pct(i)}%` }}
              onClick={() => go(i)}
              aria-label={`Go to waypoint ${i + 1}: ${w.title}`}
              aria-current={i === index ? 'step' : undefined}
            >
              <span className="fp-dot-label">{w.date}</span>
            </button>
          ))}
          <div className="fp-ship" style={{ left: `${pct(index)}%` }} data-heading={heading} aria-hidden="true">
            <span className="fp-ship-trail" />
            <svg viewBox="0 0 32 20" width="30" height="19">
              <path d="M31 10 L4 1 L9 10 L4 19 Z" fill="#22345a" stroke="var(--accent)" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M20 10 L12 7 L12 13 Z" fill="var(--accent)" />
              <circle cx="6" cy="10" r="2.6" fill="var(--accent-warm)" className="fp-ship-engine" />
            </svg>
          </div>
        </div>
        <p className="fp-hint">
          <kbd>←</kbd> <kbd>→</kbd> to travel
        </p>
      </div>
    </div>
  )
}
