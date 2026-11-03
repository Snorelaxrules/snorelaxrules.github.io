import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import type { ClusterConfig } from '../content/clusters'

/** Overlay panel for a section. Content is filled in per section (step 4). */
export function SectionPanel({ cluster }: { cluster: ClusterConfig }) {
  const navigate = useNavigate()
  const backRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // move focus into the panel without flashing a focus ring for pointer users
    backRef.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <>
      <motion.div
        className="panel-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.5 } }}
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
        onClick={() => navigate('/')}
      />
      <motion.section
        className="panel"
        aria-labelledby="panel-title"
        initial={{ opacity: 0, x: 48 }}
        animate={{ opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
        exit={{ opacity: 0, x: 32, transition: { duration: 0.25, ease: 'easeIn' } }}
      >
        <button ref={backRef} type="button" className="panel-back" onClick={() => navigate('/')}>
          <span aria-hidden="true">←</span> Back to galaxy
        </button>
        <p className="panel-kicker">{cluster.subtitle}</p>
        <h1 id="panel-title">{cluster.label}</h1>
        <p className="panel-placeholder">Section content arrives in step 4.</p>
      </motion.section>
    </>
  )
}
