import { type CSSProperties, useState } from 'react'

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Lazy-loaded image that falls back to a generated gradient when the path is
 * empty or the file is missing. `seed` keeps each placeholder's colours stable.
 */
export function Photo({ src, alt, seed, className = '' }: { src: string; alt: string; seed: string; className?: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    const h = hash(seed)
    const style = {
      '--ph-a': `${190 + (h % 90)}`,
      '--ph-b': `${190 + ((h >>> 8) % 90)}`,
      '--ph-x': `${20 + ((h >>> 16) % 60)}%`,
    } as CSSProperties
    return (
      <div className={`photo photo-placeholder ${className}`} style={style} role="img" aria-label={`${alt} (photo placeholder)`}>
        <span>Photo placeholder</span>
      </div>
    )
  }

  return (
    <img
      className={`photo ${className}`}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
