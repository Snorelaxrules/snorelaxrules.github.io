/**
 * Mutable per-frame flight state shared between the jump driver and the star
 * layers. Deliberately not React state: it changes every frame.
 */
export const WARP_DEPTH = 500

export const flight = {
  /** accumulated forward travel, wrapped to WARP_DEPTH */
  travel: 0,
  speed: 0,
  warp: 0,
  /** base opacity of the near-star layer */
  dust: 0,
  /** streak length in world units */
  stretch: 0,
}
