import { type ComponentType, lazy } from 'react'
import About from './about/About'
import ComingSoon from './ComingSoon'
import Contact from './Contact'
import Lab from './Lab'
import type { SectionProps } from './types'
import Writing from './writing/Writing'

/**
 * Cluster id → page component. A cluster in content/clusters.json without an
 * entry here gets the ComingSoon page.
 */
const sections: Record<string, ComponentType<SectionProps>> = {
  about: About,
  writing: Writing,
  // MapLibre only loads when someone visits the map
  map: lazy(() => import('./MapSection')),
  lab: Lab,
  contact: Contact,
}

/** Sections that use the wide page layout. */
export const WIDE_SECTIONS = new Set(['about', 'map', 'lab', 'writing'])

export const sectionFor = (id: string) => sections[id] ?? ComingSoon
