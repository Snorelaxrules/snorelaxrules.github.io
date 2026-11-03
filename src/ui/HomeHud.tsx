import { motion } from 'motion/react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { clusters } from '../content/clusters'
import { site } from '../content/site'
import { goTo, useGalaxy } from '../state/galaxyStore'

/** Brand mark + a keyboard-accessible destination list mirroring the clusters. */
export function HomeHud({ visible }: { visible: boolean }) {
  const hovered = useGalaxy((s) => s.hovered)
  const setHovered = useGalaxy((s) => s.setHovered)

  // pointer cursor while a cluster in the scene is hovered
  useEffect(() => {
    document.body.style.cursor = hovered && visible ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered, visible])

  return (
    <motion.div
      className="home-hud"
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0, transition: { duration: visible ? 0.8 : 0.3, delay: visible ? 0.3 : 0 } }}
      style={{ pointerEvents: 'none' }}
      aria-hidden={!visible}
    >
      <Link to="/" className="brand" tabIndex={visible ? 0 : -1}>
        {site.name}
      </Link>
      <nav className="dest-nav" aria-label="Destinations">
        <span className="dest-nav-hint">Select a destination</span>
        <ul>
          {clusters.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                tabIndex={visible ? 0 : -1}
                className={hovered === c.id ? 'is-active' : undefined}
                onPointerEnter={() => setHovered(c.id)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(c.id)}
                onBlur={() => setHovered(null)}
                onClick={() => goTo(c.route)}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </motion.div>
  )
}
