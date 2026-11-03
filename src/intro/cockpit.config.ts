/**
 * Cockpit art configuration.
 *
 * To replace the SVG frame with a painted PNG:
 *   1. Export a 1600×900 (or any 16:9) PNG with the window areas fully transparent.
 *   2. Put it in /public, e.g. /public/cockpit.png.
 *   3. Set `frameImage: '/cockpit.png'`.
 * The image is scaled like the SVG (cover, anchored bottom-center), so the
 * instruments overlay — which uses the same 1600×900 coordinate space — stays aligned.
 * Set `instruments: false` if your art already includes screens/readouts; the
 * start lever always renders.
 */
export const cockpitConfig: { frameImage: string | null; instruments: boolean } = {
  frameImage: null,
  instruments: true,
}

/** Shared coordinate space for frame art and instruments. */
export const VIEWBOX = '0 0 1600 900'
export const ASPECT = 'xMidYMax slice'

export const PANES = [
  'M120 210 Q260 120 482 96 L418 588 L150 588 Q110 400 120 210Z',
  'M516 92 Q800 70 1084 92 L1150 588 L450 588Z',
  'M1480 210 Q1340 120 1118 96 L1182 588 L1450 588 Q1490 400 1480 210Z',
]
