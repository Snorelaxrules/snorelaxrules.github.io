import { create } from 'zustand'
import type { JumpMode } from '../intro/timeline'

export type IntroPhase = 'cockpit' | 'jumping' | 'arrived'

const PLAYED_KEY = 'tl:intro-played'

function readPlayed() {
  try {
    return sessionStorage.getItem(PLAYED_KEY) === '1'
  } catch {
    return false
  }
}

function markPlayed() {
  try {
    sessionStorage.setItem(PLAYED_KEY, '1')
  } catch {
    // storage unavailable (private mode etc.) — intro will just replay next load
  }
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * The intro plays once per session, and only when landing on the root route.
 * `?intro` forces it (handy while tuning).
 */
function initialPhase(): IntroPhase {
  const forced = new URLSearchParams(window.location.search).has('intro')
  if (forced) return 'cockpit'
  const atRoot = ['', '#', '#/'].includes(window.location.hash)
  return atRoot && !readPlayed() ? 'cockpit' : 'arrived'
}

interface IntroState {
  phase: IntroPhase
  mode: JumpMode
  /** performance.now() at jump start */
  startedAt: number
  engage: () => void
  skip: () => void
  finish: () => void
  replay: () => void
}

export const useIntro = create<IntroState>()((set, get) => ({
  phase: initialPhase(),
  mode: 'full',
  startedAt: 0,
  engage: () => {
    if (get().phase !== 'cockpit') return
    markPlayed()
    set({
      phase: 'jumping',
      mode: prefersReducedMotion() ? 'reduced' : 'full',
      startedAt: performance.now(),
    })
  },
  skip: () => {
    if (get().phase !== 'cockpit') return
    markPlayed()
    set({ phase: 'jumping', mode: 'reduced', startedAt: performance.now() })
  },
  finish: () => {
    if (get().phase === 'jumping') set({ phase: 'arrived' })
  },
  replay: () => set({ phase: 'cockpit' }),
}))
