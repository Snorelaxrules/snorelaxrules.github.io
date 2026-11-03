import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { useIntro } from '../state/introStore'
import { Cockpit } from './Cockpit'
import { JumpOverlay } from './JumpOverlay'
import './cockpit.css'

export function IntroLayer() {
  const phase = useIntro((s) => s.phase)
  const skip = useIntro((s) => s.skip)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [skip])

  return (
    <>
      <Cockpit />
      <JumpOverlay />
      <AnimatePresence>
        {phase === 'cockpit' && (
          <motion.button
            key="skip"
            type="button"
            className="skip-intro"
            onClick={skip}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.6, duration: 0.5 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            Skip intro <kbd>Esc</kbd>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}
