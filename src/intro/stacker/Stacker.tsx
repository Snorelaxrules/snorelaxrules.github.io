import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { useIntro } from '../../state/introStore'
import { useCharge } from './charge'
import type { Action } from './config'
import { Game } from './engine'
import { InputController, KEY_ACTIONS } from './input'
import { drawBoard, drawPieces } from './render'
import './stacker.css'

type Status = 'idle' | 'running' | 'paused' | 'over'

interface KeyEvt {
  down: boolean
  action: Action
  t: number
}

const fmtTime = (ms: number) => {
  const s = ms / 1000
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`
}

/**
 * The dashboard game screen. Idle until clicked; while focused it owns the
 * game keys (window capture listeners, attached only while focused). The loop
 * runs only while focused, playing, and the tab is visible. Game state lives
 * in refs; the DOM is touched per frame only for the stats.
 */
export function Stacker() {
  const rootRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLCanvasElement>(null)
  const holdRef = useRef<HTMLCanvasElement>(null)
  const nextRef = useRef<HTMLCanvasElement>(null)
  const linesRef = useRef<HTMLElement>(null)
  const levelRef = useRef<HTMLElement>(null)
  const timeRef = useRef<HTMLElement>(null)
  const gameRef = useRef<Game | null>(null)
  const inputRef = useRef<InputController | null>(null)
  const queueRef = useRef<KeyEvt[]>([])

  const [status, setStatus] = useState<Status>('idle')
  const [focused, setFocused] = useState(false)
  const engaged = useIntro((s) => s.phase !== 'cockpit')
  const running = focused && status === 'running' && !engaged

  const paint = () => {
    const game = gameRef.current
    if (boardRef.current) drawBoard(boardRef.current, game)
    if (holdRef.current) drawPieces(holdRef.current, [game?.hold ?? null], 1, game?.holdUsed)
    if (nextRef.current) drawPieces(nextRef.current, game?.preview() ?? [], 5)
    const set = (el: HTMLElement | null, text: string) => {
      if (el && el.textContent !== text) el.textContent = text
    }
    set(linesRef.current, String(game?.lines ?? 0))
    set(levelRef.current, String(game?.level ?? 1))
    set(timeRef.current, fmtTime(game?.time ?? 0))
  }

  const newGame = () => {
    const game = new Game()
    game.onLines = (n) => useCharge.getState().add(n)
    gameRef.current = game
    inputRef.current ??= new InputController()
    inputRef.current.reset()
    queueRef.current.length = 0
    setStatus('running')
  }

  const play = () => {
    if (status === 'idle') newGame()
    else if (status === 'paused') setStatus('running')
  }

  // the latest render's handlers, for long-lived listeners and the loop
  const api = useRef({ paint, play, newGame, status })
  useEffect(() => {
    api.current = { paint, play, newGame, status }
  })

  // canvases track their CSS size × devicePixelRatio
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      for (const c of [boardRef.current, holdRef.current, nextRef.current]) {
        if (!c) continue
        const w = Math.round(c.clientWidth * dpr)
        const h = Math.round(c.clientHeight * dpr)
        if (c.width !== w || c.height !== h) {
          c.width = w
          c.height = h
        }
      }
      api.current.paint()
    }
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    fit()
    return () => ro.disconnect()
  }, [])

  // repaint on state changes (pause, game over, restart) while the loop isn't running
  useEffect(() => {
    api.current.paint()
  }, [status, focused])

  // engaging hyperdrive (or skipping the intro) takes focus away and the screen fades out
  useEffect(() => {
    if (engaged) rootRef.current?.blur()
  }, [engaged])

  // keyboard ownership while focused
  useEffect(() => {
    if (!focused) return
    const root = rootRef.current
    const stamp = (e: Event) => (e.timeStamp > 0 ? Math.min(e.timeStamp, performance.now()) : performance.now())

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // unfocus (and pause) before the intro's Esc-to-skip sees it
        e.preventDefault()
        e.stopPropagation()
        root?.blur()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const action = KEY_ACTIONS.get(e.code)
      if (!action) {
        if (e.key === 'Enter' && !e.repeat) {
          e.preventDefault()
          api.current.play()
        }
        return
      }
      e.preventDefault()
      e.stopPropagation()
      if (e.repeat) return
      if (action === 'restart') {
        api.current.newGame()
        return
      }
      if (api.current.status === 'running') queueRef.current.push({ down: true, action, t: stamp(e) })
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const action = KEY_ACTIONS.get(e.code)
      if (!action) return
      e.preventDefault()
      e.stopPropagation()
      queueRef.current.push({ down: false, action, t: stamp(e) })
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!root?.contains(e.target as Node)) root?.blur()
    }
    const leave = () => root?.blur()
    const onVisibility = () => {
      if (document.hidden) leave()
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('blur', leave)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('blur', leave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [focused])

  // the game loop
  useEffect(() => {
    if (!running) return
    const input = inputRef.current
    const queue = queueRef.current
    if (!input) return
    const loop = { raf: 0, last: performance.now() }
    const frame = () => {
      // read each frame: R swaps in a new game without stopping the loop
      const game = gameRef.current
      if (!game) return
      const now = performance.now()
      const dt = Math.min(now - loop.last, 100)
      loop.last = now
      const q = queueRef.current
      for (const ev of q) {
        if (ev.down) input.press(ev.action, ev.t, game)
        else input.release(ev.action, ev.t)
      }
      q.length = 0
      input.update(now, game)
      game.tick(dt, input.gravityFactor)
      // a piece that just spawned inherits the DAS charge / soft drop straight away
      input.update(now, game)
      api.current.paint()
      if (game.over) {
        setStatus('over')
        return
      }
      loop.raf = requestAnimationFrame(frame)
    }
    loop.raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(loop.raf)
      // keyups won't reach us while paused: start clean next time
      input.reset()
      queue.length = 0
    }
  }, [running])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (engaged || e.button !== 0) return
    e.preventDefault()
    rootRef.current?.focus({ preventScroll: true })
    play()
  }

  const onBlur = () => {
    setFocused(false)
    if (status === 'running') setStatus('paused')
  }

  let prompt: string | null = null
  if (status === 'over') prompt = focused ? 'Game over · press R' : 'Game over · click, then R'
  else if (status === 'idle') prompt = focused ? 'Press Enter to play' : 'Click to play'
  else if (status === 'paused' || !focused) prompt = focused ? 'Press Enter to resume' : 'Paused · click to resume'

  return (
    <div
      ref={rootRef}
      className={`stacker${focused ? ' is-focused' : ''}${engaged ? ' is-off' : ''}`}
      tabIndex={engaged ? -1 : 0}
      role="application"
      aria-roledescription="game"
      aria-label="Cargo Loader, a block-stacking game"
      aria-describedby="stacker-help"
      onPointerDown={onPointerDown}
      onFocus={() => setFocused(true)}
      onBlur={onBlur}
    >
      <p id="stacker-help" className="sr-only">
        Click or press Enter to play. Left and right arrows move, down soft drops, space hard drops, up or X rotates clockwise, Z
        counterclockwise, A 180 degrees, Shift or C holds. R restarts, Escape pauses.
      </p>
      <div className="stacker-side">
        <span className="stacker-label">Hold</span>
        <canvas ref={holdRef} className="stacker-hold" aria-hidden="true" />
        <dl className="stacker-stats">
          <div>
            <dt>Lines</dt>
            <dd ref={linesRef}>0</dd>
          </div>
          <div>
            <dt>Level</dt>
            <dd ref={levelRef}>1</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd ref={timeRef}>0:00.0</dd>
          </div>
        </dl>
        <span className="stacker-brand">Cargo loader</span>
      </div>
      <div className="stacker-well">
        <canvas ref={boardRef} className="stacker-board" aria-hidden="true" />
        {prompt && (
          <p className={`stacker-prompt${status === 'over' ? ' is-over' : ''}`} aria-live="polite">
            {prompt}
          </p>
        )}
      </div>
      <div className="stacker-side">
        <span className="stacker-label">Next</span>
        <canvas ref={nextRef} className="stacker-next" aria-hidden="true" />
      </div>
    </div>
  )
}
