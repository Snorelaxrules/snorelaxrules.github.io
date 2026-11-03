import { SectionHeader } from './SectionHeader'
import type { SectionProps } from './types'

/** Used for clusters without a section component yet. */
export default function ComingSoon({ cluster }: SectionProps) {
  return (
    <>
      <SectionHeader kicker={cluster.subtitle} title={cluster.label} />
      <p className="muted">Uncharted space. Check back soon.</p>
    </>
  )
}
