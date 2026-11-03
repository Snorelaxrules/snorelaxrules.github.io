import { create } from 'zustand'

interface GalaxyState {
  /** cluster under the pointer (or focused in the nav) */
  hovered: string | null
  /** cluster whose route is active */
  activeId: string | null
  /** cluster the camera has finished flying to (panel opens when this matches activeId) */
  docked: string | null
  setHovered: (id: string | null) => void
  setActive: (id: string | null) => void
  setDocked: (id: string | null) => void
}

export const useGalaxy = create<GalaxyState>()((set, get) => ({
  hovered: null,
  activeId: null,
  docked: null,
  setHovered: (hovered) => {
    if (get().hovered !== hovered) set({ hovered })
  },
  setActive: (activeId) => {
    if (get().activeId !== activeId) set({ activeId, hovered: null })
  },
  setDocked: (docked) => {
    if (get().docked !== docked) set({ docked })
  },
}))

/** Navigate without needing router context (works from inside the R3F tree). */
export function goTo(route: string) {
  window.location.hash = route
}
