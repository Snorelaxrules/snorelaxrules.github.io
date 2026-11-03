import { Link, Navigate, useLocation } from 'react-router'
import { formatDate, postBySlug, posts } from '../content/writing'
import { SectionHeader } from './SectionHeader'
import type { SectionProps } from './types'

export default function Writing({ cluster }: SectionProps) {
  const { pathname } = useLocation()
  const prefix = `${cluster.route}/`
  const slug = pathname.startsWith(prefix) ? decodeURIComponent(pathname.slice(prefix.length)) : null

  if (slug) {
    const post = postBySlug(slug)
    if (!post) return <Navigate to={cluster.route} replace />
    return (
      <article className="post">
        <Link to={cluster.route} className="post-back">
          ← All writing
        </Link>
        <SectionHeader kicker={formatDate(post.date)} title={post.title}>
          <p>
            {post.summary} <span className="muted">· {post.readingMinutes} min read</span>
          </p>
        </SectionHeader>
        <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />
      </article>
    )
  }

  return (
    <>
      <SectionHeader kicker={cluster.subtitle} title={cluster.label} />
      {posts.length === 0 ? (
        <p className="muted">Nothing here yet.</p>
      ) : (
        <ol className="post-list">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link to={`${cluster.route}/${p.slug}`} className="post-item">
                <time dateTime={p.date}>{formatDate(p.date)}</time>
                <h2>{p.title}</h2>
                <p>{p.summary}</p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
