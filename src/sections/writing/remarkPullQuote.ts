import type { Blockquote, Parent, Root } from 'mdast'

const MARKER = /^\[!pull\][ \t]*/i

/**
 * Pull quotes: a blockquote whose text starts with `[!pull]` becomes
 * `<blockquote class="pull-quote">`, marker removed.
 *
 *   > [!pull] The dark is what made them visible.
 */
export function remarkPullQuote() {
  return (tree: Root) => {
    const walk = (node: Parent) => {
      for (const child of node.children) {
        if (child.type === 'blockquote') mark(child)
        if ('children' in child) walk(child as Parent)
      }
    }
    walk(tree)
  }
}

function mark(quote: Blockquote) {
  const first = quote.children[0]
  if (first?.type !== 'paragraph') return
  const text = first.children[0]
  if (text?.type !== 'text' || !MARKER.test(text.value)) return
  // the marker may sit alone on its line: drop it and the line break after it
  text.value = text.value.replace(MARKER, '').replace(/^\s+/, '')
  if (!text.value) {
    first.children.shift()
    if (first.children[0]?.type === 'break') first.children.shift()
  }
  const data = (quote.data ?? {}) as { hProperties?: Record<string, unknown> }
  quote.data = { ...data, hProperties: { ...data.hProperties, className: ['pull-quote'] } } as Blockquote['data']
}
