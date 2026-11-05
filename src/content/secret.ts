import raw from '../../content/secret.json'

export interface SecretContent {
  title: string
  /** Markdown */
  text: string
  image: string
  link: { label: string; url: string }
}

export const secret: SecretContent = raw
