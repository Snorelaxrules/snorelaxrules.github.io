/**
 * Mutable per-frame flight state, written by JumpDriver from the intro timeline
 * and read by the camera rig and star layers. Not React state: it changes every frame.
 */
export const WARP_DEPTH = 500

export const flight = {
  t: 0,
  /** accumulated forward travel, wrapped to WARP_DEPTH */
  travel: 0,
  speed: 0,
  warp: 0,
  /** base opacity of the near-star layer */
  dust: 0,
  /** streak length in world units */
  stretch: 0,
  fov: 55,
  shake: 0,
  reveal: 0,
  approach: 1,
}
