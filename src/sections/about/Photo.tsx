import { type CSSProperties, useState } from 'react'
import { prefersReducedMotion } from '../../scene/pointer'

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/** "tetris.png" and "/tetris.png" both mean public/tetris.png; full URLs pass through */
const resolve = (src: string) => (/^(https?:|data:|\/)/.test(src) ? src : `${import.meta.env.BASE_URL}${src}`)

const VIDEO = /\.(mp4|webm|mov|m4v)(\?.*)?$/i

/**
 * Lazy-loaded image (or video, by file extension) that falls back to a generated gradient when the path is
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

  if (VIDEO.test(src)) {
    // silent loop like a moving photo; the controls unmute it. With reduced
    // motion it waits for play instead.
    const still = prefersReducedMotion()
    return (
      <video
        className={`photo ${className}`}
        src={resolve(src)}
        aria-label={alt}
        autoPlay={!still}
        muted
        loop
        playsInline
        controls
        preload={still ? 'metadata' : 'auto'}
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <img
      className={`photo ${className}`}
      src={resolve(src)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
