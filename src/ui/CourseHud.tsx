import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { COURSE } from '../scene/course/courseConfig'
import { course, formatTime, useCourse } from '../scene/course/courseState'
import { ship } from '../scene/ship/shipState'
import './course.css'

/**
 * Course HUD (only inside the anomaly course): timer, rings, speed, best.
 * Text and the crash/warp overlays are written straight to the DOM from a rAF
 * loop that runs only while in the course or while an effect is fading.
 */
export function CourseHud() {
  const inCourse = useCourse((s) => s.inCourse)
  const countdown = useCourse((s) => s.countdown)
  const best = useCourse((s) => s.best)
  const trajectory = useCourse((s) => s.trajectory)
  const timeRef = useRef<HTMLElement>(null)
  const ringsRef = useRef<HTMLElement>(null)
  const speedRef = useRef<HTMLElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const warpRef = useRef<HTMLDivElement>(null)

  // "GO" shows briefly, then clears
  useEffect(() => {
    if (countdown !== 0) return
    const id = window.setTimeout(() => {
      if (useCourse.getState().countdown === 0) useCourse.getState().set({ countdown: null })
    }, 700)
    return () => window.clearTimeout(id)
  }, [countdown])

  useEffect(() => {
    if (!inCourse) return
    const flash = flashRef.current
    const warp = warpRef.current
    const loop = { raf: 0, last: performance.now() }
    const set = (el: HTMLElement | null, text: string) => {
      if (el && el.textContent !== text) el.textContent = text
    }
    const opacity = (el: HTMLElement | null, v: number) => {
      const o = v.toFixed(3)
      if (el && el.style.opacity !== o) el.style.opacity = o
    }
    const frame = (now: number) => {
      const dt = Math.min((now - loop.last) / 1000, 0.1)
      loop.last = now
      const racing = course.status !== 'idle' && course.status !== 'countdown'
      set(timeRef.current, racing || course.status === 'done' ? formatTime(course.time) : formatTime(0))
      set(ringsRef.current, `${Math.min(course.next, COURSE.rings.length)}/${COURSE.rings.length}`)
      set(speedRef.current, String(Math.round(Math.hypot(ship.vel.x, ship.vel.y))))
      course.flash = Math.max(0, course.flash - dt * 2.2)
      opacity(flashRef.current, course.flash)
      opacity(warpRef.current, course.warp)
      loop.raf = requestAnimationFrame(frame)
    }
    loop.raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(loop.raf)
      course.flash = 0
      if (flash) flash.style.opacity = '0'
      if (warp) warp.style.opacity = '0'
    }
  }, [inCourse])

  return (
    <>
      <div ref={flashRef} className="course-flash" style={{ opacity: 0 }} aria-hidden="true" />
      <div ref={warpRef} className="course-warp" style={{ opacity: 0 }} aria-hidden="true" />
      <AnimatePresence>
        {inCourse && (
          <motion.div
            key="hud"
            className="course-hud"
            role="status"
            aria-label="Anomaly course"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.4 } }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            <span className="course-hud-title">Gravitational anomaly</span>
            <dl>
              <div>
                <dt>Time</dt>
                <dd ref={timeRef}>0:00.00</dd>
              </div>
              <div>
                <dt>Rings</dt>
                <dd ref={ringsRef}>0/{COURSE.rings.length}</dd>
              </div>
              <div>
                <dt>Speed</dt>
                <dd ref={speedRef}>0</dd>
              </div>
              <div>
                <dt>Best</dt>
                <dd>{best === null ? '—' : formatTime(best)}</dd>
              </div>
            </dl>
            <span className="course-hud-traj">Trajectory {trajectory ? 'on' : 'off'}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {countdown !== null && inCourse && (
          <motion.p
            key={countdown}
            className={`course-count${countdown === 0 ? ' is-go' : ''}`}
            aria-live="assertive"
            initial={{ opacity: 0, scale: 1.4 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.25 } }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
          >
            {countdown === 0 ? 'Go' : countdown}
          </motion.p>
        )}
      </AnimatePresence>
    </>
  )
}
