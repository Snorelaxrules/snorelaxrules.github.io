import { create } from 'zustand'
import { webglAvailable } from '../scene/webgl'

interface GalaxyState {
  /** cluster under the pointer (or focused in the nav) */
  hovered: string | null
  /** nearest cluster within range of the ship */
  proximity: string | null
  /** controls hint at the bottom of the galaxy view */
  hintVisible: boolean
  /** cluster whose route is active */
  activeId: string | null
  /** cluster the camera has finished flying to (panel opens when this matches activeId) */
  docked: string | null
  /** false when WebGL is missing or the scene crashed: pages open without a flight */
  sceneAvailable: boolean
  setHovered: (id: string | null) => void
  setProximity: (id: string | null) => void
  setHintVisible: (visible: boolean) => void
  setActive: (id: string | null) => void
  setDocked: (id: string | null) => void
  disableScene: () => void
}

export const useGalaxy = create<GalaxyState>()((set, get) => ({
  hovered: null,
  proximity: null,
  hintVisible: true,
  activeId: null,
  docked: null,
  sceneAvailable: webglAvailable,
  setHovered: (hovered) => {
    if (get().hovered !== hovered) set({ hovered })
  },
  setProximity: (proximity) => {
    if (get().proximity !== proximity) set({ proximity })
  },
  setHintVisible: (hintVisible) => {
    if (get().hintVisible !== hintVisible) set({ hintVisible })
  },
  setActive: (activeId) => {
    if (get().activeId === activeId) return
    set({ activeId, hovered: null, proximity: null, ...(get().sceneAvailable ? {} : { docked: activeId }) })
  },
  setDocked: (docked) => {
    if (get().docked !== docked) set({ docked })
  },
  disableScene: () => set((s) => ({ sceneAvailable: false, docked: s.activeId })),
}))

/** Navigate without needing router context (works from inside the R3F tree). */
export function goTo(route: string) {
  window.location.hash = route
}
