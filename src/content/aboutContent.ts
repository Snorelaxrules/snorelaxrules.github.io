import dossierRaw from '../../content/about/dossier.json'
import interestsRaw from '../../content/about/interests.json'
import planetRaw from '../../content/about/planet.json'
import timelineRaw from '../../content/about/timeline.json'
import { parseFrontmatter, renderMarkdown, str } from './markdown'

export interface Dossier {
  name: string
  fileId: string
  clearance: string
  photo: string
  resume: string
  fields: { label: string; value: string }[]
  now: { reading: string; playing: string; listening: string }
  motto: string
  redacted: string[]
}

export interface Waypoint {
  title: string
  date: string
  photo: string
  text: string
}

export type StarId = 'polaris' | 'yildun' | 'epsilon' | 'zeta' | 'eta' | 'pherkad' | 'kochab'

export interface Interest {
  star: StarId
  title: string
  text: string
  photo: string
}

export interface LogEntry {
  slug: string
  title: string
  date: string
  html: string
}

export const dossier: Dossier = dossierRaw
export const waypoints: Waypoint[] = timelineRaw.waypoints
export const interests = interestsRaw.interests as Interest[]

const logFiles = import.meta.glob<string>('../../content/about/log/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export const logEntries: LogEntry[] = Object.entries(logFiles)
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw)
    const slug = path.split('/').pop()!.replace(/\.md$/, '')
    return { slug, title: str(data.title) || slug, date: str(data.date), html: renderMarkdown(body) }
  })
  .sort((a, b) => b.date.localeCompare(a.date))

/** "Stardate 2026.308": year plus day-of-year, from a YYYY-MM-DD date. */
export function stardate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  const day = Math.floor((d.getTime() - start) / 86_400_000)
  return `Stardate ${d.getUTCFullYear()}.${String(day).padStart(3, '0')}`
}

// --- Planet Scan ----------------------------------------------------------------


export interface PlanetLook {
  seed: number
  seaLevel: number
  rotationSpeed: number
  clouds: boolean
  colors: Record<
    'deepOcean' | 'ocean' | 'shallows' | 'land' | 'highlands' | 'ice' | 'clouds' | 'atmosphere' | 'cityLights',
    string
  >
}

/** One fact: a plain label, the fact itself, and an optional short planet-flavour line. */
export interface ReadoutRow {
  label: string
  value: string
  flavor?: string
}

export interface ReadoutSection {
  /** plain section heading (omit for an untitled group) */
  title?: string
  rows: ReadoutRow[]
  /** names drawn as equal decorative segments; never proportions */
  strip?: string[]
}

export interface Moon {
  name: string
  value: string
  image: string
  /** small glyph by the moon: book, game, spotify, music, film (see MoonIcon) */
  icon?: string
  color: string
  size: number
  radius: number
  speed: number
  tilt: number
}

export interface PlanetScanContent {
  planet: PlanetLook
  readout: ReadoutSection[]
  unexplored: string[]
  motto: { value: string; flavor?: string }
  resume: string
  moons: Moon[]
}

export const planetScan = planetRaw as PlanetScanContent
