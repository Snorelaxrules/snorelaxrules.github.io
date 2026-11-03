import { type ComponentType, lazy } from 'react'
import About from './About'
import ComingSoon from './ComingSoon'
import Contact from './Contact'
import Lab from './Lab'
import type { SectionProps } from './types'
import Writing from './Writing'

/**
 * Cluster id → page component. A cluster in content/clusters.json without an
 * entry here gets the ComingSoon page.
 */
const sections: Record<string, ComponentType<SectionProps>> = {
  about: About,
  writing: Writing,
  // d3 + the world outline only load when someone visits the map
  map: lazy(() => import('./MapSection')),
  lab: Lab,
  contact: Contact,
}

/** Sections that use the wide page layout. */
export const WIDE_SECTIONS = new Set(['map', 'lab'])

export const sectionFor = (id: string) => sections[id] ?? ComingSoon
