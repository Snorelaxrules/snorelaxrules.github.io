import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { Link } from 'react-router'
import { clusterById, clusters } from '../content/clusters'
import { site } from '../content/site'
import { useCourse } from '../scene/course/courseState'
import { goTo, useGalaxy } from '../state/galaxyStore'

/** Brand mark + a keyboard-accessible destination list mirroring the clusters. */
export function HomeHud({ visible }: { visible: boolean }) {
  const hovered = useGalaxy((s) => s.hovered)
  const setHovered = useGalaxy((s) => s.setHovered)
  const proximity = useGalaxy((s) => s.proximity)
  const hintVisible = useGalaxy((s) => s.hintVisible)
  const target = clusterById(proximity)
  const inCourse = useCourse((s) => s.inCourse)

  // pointer cursor while a cluster in the scene is hovered
  useEffect(() => {
    // galaxy view: grab cursor signals the background can be dragged
    document.body.style.cursor = !visible ? '' : hovered ? 'pointer' : 'grab'
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
        <div className="hud-prompt-slot" aria-live="polite">
          <AnimatePresence>
            {target && visible && (
              <motion.p
                key={target.id}
                className="hud-prompt"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.25 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                Press <kbd>Space</kbd> to enter <strong>{target.label}</strong>
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <motion.p
          className="hud-hint"
          animate={{ opacity: inCourse ? 0 : hintVisible && !target ? 1 : 0 }}
          transition={{ duration: hintVisible ? 0.6 : 1.2 }}
          aria-hidden={!hintVisible}
        >
          <span className="keys">
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd>
          </span>
          to fly <span className="sep">·</span> <kbd>Space</kbd> to enter <span className="sep">·</span> or click a cluster{' '}
          <span className="sep">·</span> drag to look around
        </motion.p>
        <motion.p
          className="hud-hint hud-hint-course"
          initial={false}
          animate={{ opacity: inCourse ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          aria-hidden={!inCourse}
        >
          <kbd>A</kbd>
          <kbd>D</kbd> turn <span className="sep">·</span> <kbd>W</kbd> thrust <span className="sep">·</span> <kbd>S</kbd> brake{' '}
          <span className="sep">·</span> <kbd>R</kbd> respawn <span className="sep">·</span> <kbd>T</kbd> trajectory{' '}
          <span className="sep">·</span> <kbd>Esc</kbd> exit course
        </motion.p>
        <ul>
          {clusters.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                tabIndex={visible ? 0 : -1}
                className={hovered === c.id || proximity === c.id ? 'is-active' : undefined}
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
