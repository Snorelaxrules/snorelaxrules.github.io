import { type FocusEvent, type FormEvent, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { useIntro } from '../../state/introStore'
import { useCharge } from './charge'
import { type Action, HANDLING_IDS, HANDLING_PRESETS, type HandlingId, RULES } from './config'
import { Game } from './engine'
import { InputController, KEY_ACTIONS } from './input'
import { NAME_MAX, type Score, addScore, lastName, loadHandling, loadScores, qualifies, saveHandling } from './leaderboard'
import { PieceStrip } from './PieceStrip'
import { drawBoard, drawPieces } from './render'
import './stacker.css'

/** idle: title + leaderboard · entry: name field after a qualifying run · board: results */
type Status = 'idle' | 'running' | 'paused' | 'entry' | 'board'

interface RunResult {
  lines: number
  timeUp: boolean
  mode: HandlingId
}

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
  const nameRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<Status>('idle')
  const [focused, setFocused] = useState(false)
  const [scores, setScores] = useState<Score[]>(loadScores)
  const [result, setResult] = useState<RunResult | null>(null)
  /** index of the run just saved, highlighted on the board */
  const [placed, setPlaced] = useState(-1)
  const [name, setName] = useState(lastName)
  /** sensitivity preset, picked on the menu */
  const [mode, setMode] = useState<HandlingId>(loadHandling)
  /** the preset the current run was started with */
  const runModeRef = useRef<HandlingId>(mode)
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
    const t = game?.time ?? 0
    set(timeRef.current, fmtTime(RULES.timeLimit > 0 ? RULES.timeLimit - t : t))
  }

  const newGame = () => {
    const game = new Game()
    game.onLines = (n) => useCharge.getState().add(n)
    gameRef.current = game
    runModeRef.current = mode
    inputRef.current = new InputController(HANDLING_PRESETS[mode].handling)
    queueRef.current.length = 0
    setResult(null)
    setPlaced(-1)
    setStatus('running')
  }

  const play = () => {
    if (status === 'idle' || status === 'board') newGame()
    else if (status === 'paused') setStatus('running')
  }

  /** the run ended (time up or topped out): name entry if it makes the board */
  const finish = (game: Game) => {
    const run = { lines: game.lines, timeUp: game.timeUp, mode: runModeRef.current }
    setResult(run)
    const board = loadScores()
    setScores(board)
    setStatus(qualifies(run.lines, board) ? 'entry' : 'board')
  }

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    if (status !== 'entry' || !result) return
    const { scores: board, index } = addScore(name, result.lines, result.mode)
    setScores(board)
    setPlaced(index)
    setStatus('board')
    rootRef.current?.focus({ preventScroll: true })
  }

  const skipEntry = () => {
    setStatus('board')
    rootRef.current?.focus({ preventScroll: true })
  }

  const pickMode = (id: HandlingId) => {
    setMode(id)
    saveHandling(id)
  }

  // the latest render's handlers, for long-lived listeners and the loop
  const api = useRef({ paint, play, newGame, finish, skipEntry, pickMode, status })
  useEffect(() => {
    api.current = { paint, play, newGame, finish, skipEntry, pickMode, status }
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

  // a qualifying run: straight into the name field (only if the player is still here)
  useEffect(() => {
    if (status !== 'entry') return
    const root = rootRef.current
    if (root && root.contains(document.activeElement)) {
      nameRef.current?.focus({ preventScroll: true })
      nameRef.current?.select()
    }
  }, [status])

  // engaging hyperdrive (or skipping the intro) takes focus away and the screen fades out
  useEffect(() => {
    const root = rootRef.current
    const active = document.activeElement
    if (engaged && root && active instanceof HTMLElement && root.contains(active)) active.blur()
  }, [engaged])

  // keyboard ownership while focused
  useEffect(() => {
    if (!focused) return
    const root = rootRef.current
    const stamp = (e: Event) => (e.timeStamp > 0 ? Math.min(e.timeStamp, performance.now()) : performance.now())

    const onKeyDown = (e: KeyboardEvent) => {
      if (api.current.status === 'entry') {
        // typing a name: keys belong to the field; Esc skips saving
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          api.current.skipEntry()
        }
        return
      }
      if (e.key === 'Escape') {
        // unfocus (and pause) before the intro's Esc-to-skip sees it
        e.preventDefault()
        e.stopPropagation()
        root?.blur()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const menu = api.current.status === 'idle' || api.current.status === 'board'
      if (menu && /^Digit[1-9]$/.test(e.code)) {
        const id = HANDLING_IDS[Number(e.code.slice(5)) - 1]
        if (id) {
          e.preventDefault()
          e.stopPropagation()
          api.current.pickMode(id)
          return
        }
      }
      // Enter / Space on a menu button (sensitivity, play) belong to the button
      if ((e.key === 'Enter' || e.key === ' ') && (e.target as Element | null)?.closest?.('[data-stacker-control]')) return
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
    const leave = () => {
      const active = document.activeElement
      if (root && active instanceof HTMLElement && root.contains(active)) active.blur()
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!root?.contains(e.target as Node)) leave()
    }
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
      game.tick(dt, input.gravityFactor(now))
      // a piece that just spawned inherits the DAS charge / soft drop straight away
      input.update(now, game)
      api.current.paint()
      if (game.over) {
        api.current.finish(game)
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
    // the name field, its button and the sensitivity picker take clicks normally
    if (status === 'entry' || (e.target as Element).closest('[data-stacker-control]')) return
    e.preventDefault()
    rootRef.current?.focus({ preventScroll: true })
    play()
  }

  const onBlur = (e: FocusEvent) => {
    // focus moving within the screen (e.g. into the name field) isn't leaving it
    if (rootRef.current?.contains(e.relatedTarget as Node | null)) return
    setFocused(false)
    if (status === 'running') setStatus('paused')
  }

  let prompt: string | null = null
  if (status === 'running' || status === 'paused') {
    if (status === 'paused' || !focused) prompt = focused ? 'Press Enter to resume' : 'Paused · click to resume'
  }
  const showPanel = status === 'idle' || status === 'entry' || status === 'board'

  return (
    <div
      ref={rootRef}
      className={`stacker${focused ? ' is-focused' : ''}${engaged ? ' is-off' : ''}${status === 'running' ? '' : ' is-menu'}`}
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
        One-minute run: clear as many lines as you can, then add your name to the leaderboard. Pick a sensitivity
        (Casual, Standard or Expert, or keys 1 to 3), then click or press Enter to play.
        Left and right arrows move, down soft drops, space hard drops, up or X rotates clockwise, Z
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
          <p className="stacker-prompt" aria-live="polite">
            {prompt}
          </p>
        )}
      </div>
      <div className="stacker-side">
        <span className="stacker-label">Next</span>
        <canvas ref={nextRef} className="stacker-next" aria-hidden="true" />
      </div>
      {showPanel && (
        <div className="stacker-panel" aria-live="polite">
          <div className="stacker-panel-main">
            {status === 'idle' || !result ? (
              <>
                <p className="stacker-kicker">Mini-game · one minute</p>
                <p className="stacker-title is-logo">Cargo loader</p>
                <PieceStrip />
                <p className="stacker-copy">Clear as many lines as you can before the timer runs out.</p>
              </>
            ) : (
              <>
                <p className={`stacker-kicker${result.timeUp ? '' : ' is-warm'}`}>
                  {result.timeUp ? 'Time' : 'Topped out'} · {HANDLING_PRESETS[result.mode].label}
                </p>
                <p className="stacker-title">
                  <span className="stacker-score">{result.lines}</span> {result.lines === 1 ? 'line' : 'lines'}
                </p>
              </>
            )}
            {status === 'entry' ? (
              <form className="stacker-entry" onSubmit={save}>
                <label>
                  <span>New high score · your name</span>
                  <input
                    ref={nameRef}
                    value={name}
                    maxLength={NAME_MAX}
                    spellCheck={false}
                    autoComplete="nickname"
                    tabIndex={engaged ? -1 : 0}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <button type="submit" tabIndex={engaged ? -1 : 0}>
                  Save
                </button>
                <p className="stacker-hint">Enter saves · Esc skips</p>
              </form>
            ) : (
              <>
                <div className="stacker-sens" role="radiogroup" aria-label="Sensitivity">
                  <span className="stacker-sens-label">Sensitivity</span>
                  <div className="stacker-sens-options">
                    {HANDLING_IDS.map((id, i) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={mode === id}
                        className={mode === id ? 'is-on' : undefined}
                        tabIndex={engaged ? -1 : 0}
                        data-stacker-control=""
                        title={`${HANDLING_PRESETS[id].summary} (key ${i + 1})`}
                        onClick={() => {
                          pickMode(id)
                          rootRef.current?.focus({ preventScroll: true })
                        }}
                      >
                        {HANDLING_PRESETS[id].label}
                      </button>
                    ))}
                  </div>
                  <span className="stacker-sens-summary">{HANDLING_PRESETS[mode].summary}</span>
                </div>
                <button
                  type="button"
                  className="stacker-play"
                  tabIndex={engaged ? -1 : 0}
                  data-stacker-control=""
                  onClick={() => {
                    rootRef.current?.focus({ preventScroll: true })
                    play()
                  }}
                >
                  <span aria-hidden="true">▶</span> {status === 'board' ? 'Play again' : 'Play'}
                  <span className="stacker-play-key">{focused ? (status === 'board' ? 'Enter · R' : 'Enter') : 'click'}</span>
                </button>
              </>
            )}
          </div>
          <div className="stacker-panel-board">
            <p className="stacker-kicker">Leaderboard</p>
            {scores.length ? (
              <ol className="stacker-scores">
                {scores.map((s, i) => (
                  <li key={`${s.at}-${i}`} className={i === placed ? 'is-new' : undefined}>
                    <span className="rank">{i + 1}</span>
                    <span className="who">{s.name}</span>
                    <span className="mode" title={s.mode ? HANDLING_PRESETS[s.mode]?.label : undefined}>
                      {s.mode ? (HANDLING_PRESETS[s.mode]?.label.charAt(0) ?? '') : ''}
                    </span>
                    <span className="lines">{s.lines}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="stacker-copy">No runs yet. Set the first score.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
