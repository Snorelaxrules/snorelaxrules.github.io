import { AnimatePresence, motion } from 'motion/react'
import { type KeyboardEvent, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { SectionHeader } from '../SectionHeader'
import type { SectionProps } from '../types'
import { Constellation } from './Constellation'
// Dossier (ID-card) tab, retired in favour of Planet Scan but kept for a possible return.
// To restore: uncomment this import and its TABS entry below. Content: content/about/dossier.json
// import { Dossier } from './Dossier'
import { FlightPath } from './FlightPath'
import { PlanetScan } from './planet/PlanetScan'
import { ShipsLog } from './ShipsLog'
import './about.css'

const TABS = [
  { slug: '', label: 'Planet Scan', Component: PlanetScan },
  // { slug: 'dossier', label: 'Dossier', Component: Dossier },
  { slug: 'flight-path', label: 'Flight Path', Component: FlightPath },
  { slug: 'constellation', label: 'Constellation', Component: Constellation },
  { slug: 'log', label: "Ship's Log", Component: ShipsLog },
] as const

const variants = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 36 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -36 }),
}

/** About: four "ship systems" as tabs, each with its own URL (/about, /about/log, …). */
export default function About({ cluster }: SectionProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const slug = pathname.slice(cluster.route.length).replace(/^\//, '')
  const index = TABS.findIndex((t) => t.slug === slug)

  // slide direction follows tab order (derived during render, React's recommended pattern)
  const [shown, setShown] = useState(index)
  const [direction, setDirection] = useState(1)
  if (index !== shown) {
    setDirection(index > shown ? 1 : -1)
    setShown(index)
  }

  if (index === -1) return <Navigate to={cluster.route} replace />

  const go = (i: number) => navigate(TABS[i].slug ? `${cluster.route}/${TABS[i].slug}` : cluster.route, { replace: true })

  const onTabKey = (e: KeyboardEvent) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    e.stopPropagation()
    const next = (index + delta + TABS.length) % TABS.length
    go(next)
    tabRefs.current[next]?.focus()
  }

  const { Component } = TABS[index]

  return (
    <div className="about">
      <SectionHeader kicker={cluster.subtitle} title={cluster.label} />
      <div className="systems" role="tablist" aria-label="Ship systems" onKeyDown={onTabKey}>
        {TABS.map((t, i) => (
          <button
            key={t.label}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`tab-${i}`}
            aria-selected={i === index}
            aria-controls="about-system"
            tabIndex={i === index ? 0 : -1}
            className="system-tab"
            onClick={(e) => {
              go(i)
              // pointer clicks release focus so ← / → drive the tab's content
              // (e.g. Flight Path slides); keyboard users keep arrow-key tab switching
              if (e.detail > 0) e.currentTarget.blur()
            }}
          >
            <span className="system-index">0{i + 1}</span>
            {t.label}
            {i === index && <motion.span layoutId="system-underline" className="system-underline" />}
          </button>
        ))}
      </div>
      <div id="about-system" role="tabpanel" aria-labelledby={`tab-${index}`} className="system-panel">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={index}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Component />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
