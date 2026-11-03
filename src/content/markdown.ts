import { marked } from 'marked'

export type Frontmatter = Record<string, string | string[]>

const unquote = (v: string) => v.trim().replace(/^(['"])(.*)\1$/, '$2')

/**
 * Minimal frontmatter parser: `key: value` scalars, `key: [a, b]` arrays and
 * `# comments`. Deliberately small — avoids gray-matter's Node polyfills.
 */
export function parseFrontmatter(raw: string): { data: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) return { data: {}, body: raw }
  const data: Frontmatter = {}
  for (const line of match[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!kv) continue
    const value = kv[2].trim()
    data[kv[1]] =
      value.startsWith('[') && value.endsWith(']')
        ? value.slice(1, -1).split(',').map(unquote).filter(Boolean)
        : unquote(value)
  }
  return { data, body: raw.slice(match[0].length) }
}

export const renderMarkdown = (md: string) => marked.parse(md, { async: false })

export const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(', ') : (v ?? ''))
