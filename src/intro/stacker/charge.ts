import { create } from 'zustand'

/** Lines cleared this visit, shown as the decorative FTL charge meter. Updated only on line clears. */
export const CHARGE_SEGMENTS = 10

export const useCharge = create<{ lines: number; add: (n: number) => void }>()((set) => ({
  lines: 0,
  add: (n) => set((s) => ({ lines: s.lines + n })),
}))
