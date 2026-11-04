import { AnimatePresence } from 'motion/react'
import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router'
import { clusterForPath } from './content/clusters'
import { IntroLayer } from './intro/IntroLayer'
import { SpaceCanvas } from './scene/SpaceCanvas'
import { useGalaxy } from './state/galaxyStore'
import { useIntro } from './state/introStore'
import { HomeHud } from './ui/HomeHud'
import { SceneBoundary } from './ui/SceneBoundary'
import { SectionPage } from './ui/SectionPage'
import './ui/ui.css'

export default function App() {
  const { pathname } = useLocation()
  const phase = useIntro((s) => s.phase)
  const active = clusterForPath(pathname)
  const docked = useGalaxy((s) => s.docked)
  const setActive = useGalaxy((s) => s.setActive)
  const sceneAvailable = useGalaxy((s) => s.sceneAvailable)

  useEffect(() => {
    setActive(active?.id ?? null)
  }, [active, setActive])

  if (!active && pathname !== '/') return <Navigate to="/" replace />

  return (
    <>
      {sceneAvailable ? (
        <SceneBoundary>
          <SpaceCanvas />
        </SceneBoundary>
      ) : (
        <div className="space-fallback" aria-hidden="true" />
      )}
      {phase !== 'arrived' && <IntroLayer />}
      {phase === 'arrived' && <HomeHud visible={!active} />}
      <AnimatePresence>
        {active && docked === active.id && <SectionPage key={active.id} cluster={active} />}
      </AnimatePresence>
    </>
  )
}
