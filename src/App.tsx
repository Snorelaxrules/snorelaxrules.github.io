import { AnimatePresence } from 'motion/react'
import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router'
import { clusterForPath } from './content/clusters'
import { IntroLayer } from './intro/IntroLayer'
import { SpaceCanvas } from './scene/SpaceCanvas'
import { useGalaxy } from './state/galaxyStore'
import { useIntro } from './state/introStore'
import { HomeHud } from './ui/HomeHud'
import { SectionPanel } from './ui/SectionPanel'
import './ui/ui.css'

export default function App() {
  const { pathname } = useLocation()
  const phase = useIntro((s) => s.phase)
  const active = clusterForPath(pathname)
  const docked = useGalaxy((s) => s.docked)
  const setActive = useGalaxy((s) => s.setActive)

  useEffect(() => {
    setActive(active?.id ?? null)
  }, [active, setActive])

  if (!active && pathname !== '/') return <Navigate to="/" replace />

  return (
    <>
      <SpaceCanvas />
      {phase !== 'arrived' && <IntroLayer />}
      {phase === 'arrived' && <HomeHud visible={!active} />}
      <AnimatePresence>
        {active && docked === active.id && <SectionPanel key={active.id} cluster={active} />}
      </AnimatePresence>
    </>
  )
}
