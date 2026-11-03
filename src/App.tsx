import { AnimatePresence } from 'motion/react'
import { ArrivalPlaceholder } from './ArrivalPlaceholder'
import { IntroLayer } from './intro/IntroLayer'
import { SpaceCanvas } from './scene/SpaceCanvas'
import { useIntro } from './state/introStore'

export default function App() {
  const phase = useIntro((s) => s.phase)
  return (
    <>
      <SpaceCanvas />
      {phase !== 'arrived' && <IntroLayer />}
      <AnimatePresence>{phase === 'arrived' && <ArrivalPlaceholder key="arrival" />}</AnimatePresence>
    </>
  )
}
