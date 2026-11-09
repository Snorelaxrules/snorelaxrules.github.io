import { parseFrontmatter, str } from './markdown'

/**
 * Essays: one markdown file per essay in content/writing/. The file name is
 * the URL slug (/writing/<slug>). Frontmatter: title, date (YYYY-MM-DD) and
 * summary; cover (an image path) is optional.
 */
export interface Essay {
  slug: string
  title: string
  date: string
  summary: string
  /** image path under public/ (or a full URL); empty when there is none */
  cover: string
  /** markdown body, frontmatter removed */
  body: string
  words: number
  /** words / 220, rounded up */
  readMinutes: number
}

/** reading speed for the estimate, words per minute */
export const WORDS_PER_MINUTE = 220

const files = import.meta.glob<string>('../../content/writing/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

/** Words a reader reads: code blocks, link targets, image syntax and markup don't count. */
export function countWords(md: string) {
  const text = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\^[^\]]+\]:?/g, ' ')
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

export const readMinutes = (words: number) => Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))

/** newest first */
export const essays: Essay[] = Object.entries(files)
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw)
    const slug = path.split('/').pop()!.replace(/\.md$/, '')
    const words = countWords(body)
    return {
      slug,
      title: str(data.title) || slug,
      date: str(data.date),
      summary: str(data.summary),
      cover: str(data.cover),
      body,
      words,
      readMinutes: readMinutes(words),
    }
  })
  .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))

export const essayBySlug = (slug: string) => essays.find((e) => e.slug === slug) ?? null

/** The essays on either side by date: `older` was published before this one, `newer` after. */
export function neighbors(slug: string) {
  const i = essays.findIndex((e) => e.slug === slug)
  if (i === -1) return { older: null, newer: null }
  return { older: essays[i + 1] ?? null, newer: essays[i - 1] ?? null }
}

const dateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })

/** Frontmatter dates are YYYY-MM-DD; format in UTC so they don't shift a day. */
export const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? iso : dateFormat.format(d)
}

/** "tetris.png" and "/tetris.png" both mean public/tetris.png; full URLs pass through. */
export const assetUrl = (src: string) => (/^(https?:|data:|\/)/.test(src) ? src : `${import.meta.env.BASE_URL}${src}`)
