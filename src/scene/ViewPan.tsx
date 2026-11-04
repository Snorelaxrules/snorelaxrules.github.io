import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import type { PerspectiveCamera } from 'three'
import { useGalaxy } from '../state/galaxyStore'
import { useIntro } from '../state/introStore'
import { RIG } from './rig'
import { pan } from './ship/shipState'

/** distance from the home camera to what it looks at; drag maps pixels to world units at this depth */
const VIEW_DISTANCE = RIG.home.pos.distanceTo(RIG.home.target)

/**
 * Click-and-drag on the galaxy view pans the camera (the scene follows the
 * pointer). Clicks on clusters still work: R3F reports the drag distance and
 * Cluster ignores clicks that were really drags.
 */
export function ViewPan() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera) as PerspectiveCamera

  useEffect(() => {
    const el = gl.domElement
    const drag = { id: -1, x: 0, y: 0 }
    const canPan = () => useIntro.getState().phase === 'arrived' && useGalaxy.getState().activeId === null

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !canPan()) return
      drag.id = e.pointerId
      drag.x = e.clientX
      drag.y = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== drag.id) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      if (!pan.dragging && Math.hypot(dx, dy) < 4) return
      if (!pan.dragging) {
        pan.dragging = true
        document.body.dataset.dragging = ''
      }
      const worldPerPx = (2 * VIEW_DISTANCE * Math.tan((camera.fov * Math.PI) / 360)) / el.clientHeight
      pan.x -= dx * worldPerPx
      pan.y += dy * worldPerPx
      drag.x = e.clientX
      drag.y = e.clientY
    }
    const end = (e: PointerEvent) => {
      if (e.pointerId !== drag.id) return
      drag.id = -1
      pan.dragging = false
      delete document.body.dataset.dragging
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
      pan.dragging = false
      delete document.body.dataset.dragging
    }
  }, [gl, camera])

  return null
}
