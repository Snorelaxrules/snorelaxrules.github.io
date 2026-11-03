import contactRaw from '../../content/contact.json'
import placesRaw from '../../content/places.json'
import projectsRaw from '../../content/projects.json'

export interface Place {
  name: string
  lat: number
  lng: number
  date: string
  note: string
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

export const places: Place[] = placesRaw.places
export const projects: Project[] = projectsRaw.projects
export const contact: ContactConfig = contactRaw
