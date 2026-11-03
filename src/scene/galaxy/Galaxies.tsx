import { clusters } from '../../content/clusters'
import { useGalaxy } from '../../state/galaxyStore'
import { useIntro } from '../../state/introStore'
import { Cluster } from './Cluster'

export function Galaxies() {
  const arrived = useIntro((s) => s.phase === 'arrived')
  const atHome = useGalaxy((s) => s.activeId === null)
  return (
    <>
      {clusters.map((c) => (
        <Cluster key={c.id} cfg={c} interactive={arrived && atHome} />
      ))}
    </>
  )
}
