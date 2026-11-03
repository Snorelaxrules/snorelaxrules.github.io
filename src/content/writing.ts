import { parseFrontmatter, renderMarkdown, str } from './markdown'

export interface Post {
  slug: string
  title: string
  date: string
  summary: string
  html: string
  readingMinutes: number
}

const files = import.meta.glob<string>('../../content/writing/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export const posts: Post[] = Object.entries(files)
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw)
    const slug = path.split('/').pop()!.replace(/\.md$/, '')
    return {
      slug,
      title: str(data.title) || slug,
      date: str(data.date),
      summary: str(data.summary),
      html: renderMarkdown(body),
      readingMinutes: Math.max(1, Math.round(body.split(/\s+/).length / 220)),
    }
  })
  .sort((a, b) => b.date.localeCompare(a.date))

export const postBySlug = (slug: string) => posts.find((p) => p.slug === slug) ?? null

const dateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

/** Frontmatter dates are YYYY-MM-DD; format in UTC so they don't shift a day. */
export const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : dateFormat.format(d)
}
