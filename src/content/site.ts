import raw from '../../content/site.json'

export interface SiteConfig {
  name: string
  tagline: string
}

export const site: SiteConfig = raw
