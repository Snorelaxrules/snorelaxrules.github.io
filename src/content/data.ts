import contactRaw from '../../content/contact.json'
import placesRaw from '../../content/places.json'
import projectsRaw from '../../content/projects.json'

export interface PlacePhoto {
  /** original's filename in content/places-originals/<slug>/ */
  file: string
  caption?: string
  /** name of the spot within the place, shown with the photo */
  spot?: string
  /** overrides the position read from the photo's GPS */
  lat?: number
  lng?: number
}

/** content/places.json entry; lat/lng may be left out when photos carry GPS */
interface PlaceEntry {
  slug: string
  name: string
  lat?: number
  lng?: number
  date: string
  note: string
  photos: PlacePhoto[]
}

export interface Place extends PlaceEntry {
  lat: number
  lng: number
}

/** A photo with its served URLs (null until `npm run images` has made them) and position. */
export interface ResolvedPhoto extends PlacePhoto {
  src: string | null
  thumb: string | null
  /** [lng, lat] from the JSON or the photo's GPS, or null */
  at: [number, number] | null
}

// Vite hashes and copies only the processed WebP files, never the originals.
const placeImages = import.meta.glob<string>('../../content/places/*/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
})
// written by `npm run images`: "slug/file.jpg" -> [lat, lng]
const gpsFiles = import.meta.glob<Record<string, [number, number]>>('../../content/places/gps.json', {
  eager: true,
  import: 'default',
})
const gps: Record<string, [number, number]> = Object.values(gpsFiles)[0] ?? {}

const stem = (file: string) => file.replace(/\.[^.]+$/, '')

const photoAt = (slug: string, photo: PlacePhoto): [number, number] | null => {
  if (photo.lat !== undefined && photo.lng !== undefined) return [photo.lng, photo.lat]
  const g = gps[`${slug}/${photo.file}`]
  return g ? [g[1], g[0]] : null
}

export function placePhotos(place: Place): ResolvedPhoto[] {
  return place.photos.map((photo) => {
    const base = `../../content/places/${place.slug}/${stem(photo.file)}`
    return {
      ...photo,
      src: placeImages[`${base}.webp`] ?? null,
      thumb: placeImages[`${base}.thumb.webp`] ?? null,
      at: photoAt(place.slug, photo),
    }
  })
}

/** A place without lat/lng sits at the middle of its photos' positions. */
function locate(entry: PlaceEntry): Place | null {
  if (entry.lat !== undefined && entry.lng !== undefined) return { ...entry, lat: entry.lat, lng: entry.lng }
  const pts = entry.photos.map((p) => photoAt(entry.slug, p)).filter((p) => p !== null)
  if (!pts.length) {
    if (import.meta.env.DEV) console.warn(`places.json: "${entry.slug}" has no lat/lng and no photo positions; hidden`)
    return null
  }
  const lngs = pts.map((p) => p[0])
  const lats = pts.map((p) => p[1])
  return {
    ...entry,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
  }
}

export interface Project {
  title: string
  year: string
  status: string
  description: string
  tags: string[]
  links: { label: string; url: string }[]
}

export interface ContactConfig {
  heading: string
  intro: string
  email: string
  links: { label: string; handle: string; url: string }[]
}

export const places: Place[] = (placesRaw.places as PlaceEntry[]).map(locate).filter((p) => p !== null)
export const placeBySlug = (slug: string) => places.find((p) => p.slug === slug)
export const projects: Project[] = projectsRaw.projects
export const contact: ContactConfig = contactRaw
