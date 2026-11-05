/**
 * Cargo Loader leaderboard: top scores (lines cleared in one minute), kept in
 * this browser's localStorage. Every access is guarded: with storage blocked
 * the board simply starts empty each visit.
 */

export interface Score {
  name: string
  lines: number
  /** when it was set (ms since epoch); earlier scores win ties */
  at: number
}

const SCORES_KEY = 'tl:cargo-scores'
const NAME_KEY = 'tl:cargo-name'
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
export function addScore(name: string, lines: number): { scores: Score[]; index: number } {
  const entry: Score = { name: cleanName(name), lines, at: Date.now() }
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
