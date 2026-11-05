import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { renderMarkdown } from '../content/markdown'
import { secret } from '../content/secret'
import { closeSecret, formatTime, replayCourse, useCourse } from '../scene/course/courseState'
import { Photo } from '../sections/about/Photo'
import '../sections/sections.css'
import './course.css'

/**
 * "Secret transmission": the reward for finishing the anomaly course. Same
 * overlay pattern as the section pages (the scene keeps running behind it).
 */
export function SecretPage() {
  const backRef = useRef<HTMLButtonElement>(null)
  const lastTime = useCourse((s) => s.lastTime)
  const best = useCourse((s) => s.best)

  useEffect(() => {
    backRef.current?.focus({ preventScroll: true, focusVisible: false } as FocusOptions)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      closeSecret()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  return (
    <motion.div
      className="page secret-page"
      role="dialog"
      aria-modal="true"
      aria-labelledby="secret-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.6 } }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      <div className="page-bar">
        <button ref={backRef} type="button" className="page-back" onClick={closeSecret}>
          <span aria-hidden="true">←</span> Back to galaxy
        </button>
        <span className="page-bar-title">Gravitational anomaly</span>
      </div>
      <motion.main
        className="page-main"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
      >
        <p className="secret-kicker">Incoming · decrypted</p>
        <h1 id="secret-title" className="secret-title">
          {secret.title}
        </h1>
        {lastTime !== null && (
          <p className="secret-times">
            Course time <strong>{formatTime(lastTime)}</strong>
            {best !== null && (
              <>
                {' '}
                · best <strong>{formatTime(best)}</strong>
              </>
            )}
          </p>
        )}
        {secret.image && <Photo src={secret.image} alt="" seed="secret" className="secret-image" />}
        <div className="prose secret-text" dangerouslySetInnerHTML={{ __html: renderMarkdown(secret.text) }} />
        <div className="secret-actions">
          {secret.link.url && (
            <a className="secret-btn" href={secret.link.url} target="_blank" rel="noreferrer">
              {secret.link.label || 'Open'}
            </a>
          )}
          <button type="button" className="secret-btn" onClick={replayCourse}>
            Replay course
          </button>
          <button type="button" className="secret-btn" onClick={closeSecret}>
            Back to galaxy
          </button>
        </div>
      </motion.main>
    </motion.div>
  )
}
