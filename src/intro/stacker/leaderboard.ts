/**
 * Cargo Loader leaderboard: top scores (lines cleared in one minute), kept in
 * this browser's localStorage. Every access is guarded: with storage blocked
 * the board simply starts empty each visit.
 */
import { DEFAULT_HANDLING, HANDLING_PRESETS, type HandlingId } from './config'

export interface Score {
  name: string
  lines: number
  /** when it was set (ms since epoch); earlier scores win ties */
  at: number
  /** the sensitivity it was played on (older scores have none) */
  mode?: HandlingId
}

const SCORES_KEY = 'tl:cargo-scores'
const NAME_KEY = 'tl:cargo-name'
const HANDLING_KEY = 'tl:cargo-handling'
export const BOARD_SIZE = 10
export const NAME_MAX = 12

export function loadScores(): Score[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SCORES_KEY) ?? '[]') as unknown
    if (!Array.isArray(raw)) return []
    return raw
      .filter(
        (s): s is Score =>
          typeof s === 'object' && s !== null && typeof s.name === 'string' && Number.isFinite(s.lines) && Number.isFinite(s.at),
      )
      .sort(byRank)
      .slice(0, BOARD_SIZE)
  } catch {
    return []
  }
}

function byRank(a: Score, b: Score) {
  return b.lines - a.lines || a.at - b.at
}

export function cleanName(name: string) {
  return name.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) || 'Anonymous'
}

/** Would this many lines make the board? */
export function qualifies(lines: number, scores = loadScores()) {
  return lines > 0 && (scores.length < BOARD_SIZE || lines > scores[scores.length - 1].lines)
}

/** Save a score; returns the new board and the new entry's index in it (-1 if it didn't place). */
export function addScore(name: string, lines: number, mode?: HandlingId): { scores: Score[]; index: number } {
  const entry: Score = { name: cleanName(name), lines, at: Date.now(), mode }
  const scores = [...loadScores(), entry].sort(byRank).slice(0, BOARD_SIZE)
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores))
    localStorage.setItem(NAME_KEY, entry.name)
  } catch {
    // storage unavailable: the score shows this session only
  }
  return { scores, index: scores.indexOf(entry) }
}

/** The name last entered on this browser, to prefill the field. */
export function lastName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

const isHandling = (v: unknown): v is HandlingId => typeof v === 'string' && Object.hasOwn(HANDLING_PRESETS, v)

/** The sensitivity last picked on this browser. */
export function loadHandling(): HandlingId {
  try {
    const v = localStorage.getItem(HANDLING_KEY)
    return isHandling(v) ? v : DEFAULT_HANDLING
  } catch {
    return DEFAULT_HANDLING
  }
}

export function saveHandling(id: HandlingId) {
  try {
    localStorage.setItem(HANDLING_KEY, id)
  } catch {
    // storage unavailable: the choice lasts this session only
  }
}
