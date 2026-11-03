import { motion } from 'motion/react'
import { site } from './content/site'
import { useIntro } from './state/introStore'

/** TEMPORARY (step 2 review): stands in for the galaxy map until step 3. */
export function ArrivalPlaceholder() {
  const replay = useIntro((s) => s.replay)
  return (
    <motion.div
      className="arrival"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 0.2, duration: 1 } }}
      exit={{ opacity: 0 }}
    >
      <h1>{site.name}</h1>
      <p>{site.tagline}</p>
      <button type="button" onClick={replay}>
        Replay jump
      </button>
    </motion.div>
  )
}
