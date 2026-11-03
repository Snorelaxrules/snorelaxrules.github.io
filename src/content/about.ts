import raw from '../../content/about.md?raw'
import { parseFrontmatter, renderMarkdown, str } from './markdown'

const { data, body } = parseFrontmatter(raw)

export const about = {
  role: str(data.role),
  location: str(data.location),
  photo: str(data.photo),
  resume: str(data.resume),
  html: renderMarkdown(body),
}
