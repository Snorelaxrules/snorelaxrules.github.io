import { type RefObject, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * A thin line across the top of the window with a small ship that travels
 * along it as the essay is read, leaving a lit trail. 0% when the essay's top
 * reaches the top of the window, 100% when its end is in view.
 *
 * Rendered into <body>: the section page has a backdrop-filter, which would
 * make a position: fixed child scroll with the page.
 */
export function ReadingProgress({ articleRef }: { articleRef: RefObject<HTMLElement | null> }) {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const article = articleRef.current
    const bar = barRef.current
    // the section page is the scroll container
    const scroller = article?.closest<HTMLElement>('.page')
    if (!article || !bar || !scroller) return
    const loop = { raf: 0, shown: -1 }
    const update = () => {
      loop.raf = 0
      const top = article.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
      const span = Math.max(1, article.offsetHeight - scroller.clientHeight)
      const p = Math.min(1, Math.max(0, (scroller.scrollTop - top) / span))
      bar.style.setProperty('--p', p.toFixed(4))
      const pct = Math.round(p * 100)
      if (pct !== loop.shown) {
        loop.shown = pct
        bar.setAttribute('aria-valuenow', String(pct))
      }
    }
    const schedule = () => {
      if (!loop.raf) loop.raf = requestAnimationFrame(update)
    }
    // images loading in (or a font-size change) move the end of the essay
    const ro = new ResizeObserver(schedule)
    ro.observe(article)
    ro.observe(scroller)
    scroller.addEventListener('scroll', schedule, { passive: true })
    update()
    return () => {
      cancelAnimationFrame(loop.raf)
      ro.disconnect()
      scroller.removeEventListener('scroll', schedule)
    }
  }, [articleRef])

  return createPortal(
    <div
      ref={barRef}
      className="reading-progress"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      <div className="reading-progress-track" />
      <div className="reading-progress-trail" />
      <svg className="reading-progress-ship" viewBox="-4 0 28 16" aria-hidden="true">
        {/* engine glow, hull, cockpit: a small arrowhead pointing right */}
        <path d="M2 8 L-3 6 L-3 10 Z" className="flame" />
        <path d="M22 8 L4 1.5 L7 8 L4 14.5 Z" className="hull" />
        <path d="M13 8 L8 5.6 L9.2 8 L8 10.4 Z" className="canopy" />
      </svg>
    </div>,
    document.body,
  )
}
