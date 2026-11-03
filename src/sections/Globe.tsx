import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import landTopo from 'world-atlas/land-110m.json'
import type { Place } from '../content/data'
import { damp, prefersReducedMotion } from '../scene/pointer'

const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>
const land = feature(topo, topo.objects.land)
const graticule = geoGraticule10()

const SPIN_DEG_PER_SEC = 5
/** sphere radius as a fraction of the svg size; leaves room for the atmosphere glow */
const RADIUS_FRACTION = 0.44
const DRAG_DEG_PER_PX = 0.28

/** Shortest signed angular difference, degrees. */
const angleDelta = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180

interface GlobeProps {
  places: Place[]
  selected: number | null
  onSelect: (i: number) => void
}

/**
 * Orthographic d3-geo globe drawn as SVG. Paths are updated imperatively each
 * frame; React only renders the structure.
 */
export function Globe({ places, selected, onSelect }: GlobeProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const landRef = useRef<SVGPathElement>(null)
  const gratRef = useRef<SVGPathElement>(null)
  const markerRefs = useRef<(SVGGElement | null)[]>([])
  const [size, setSize] = useState(480)
  const view = useRef({
    rot: [-10, -25] as [number, number],
    target: null as [number, number] | null,
    dragging: false,
    lastX: 0,
    lastY: 0,
  })

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setSize(Math.max(240, Math.min(480, entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (selected === null) return
    const p = places[selected]
    view.current.target = [-p.lng, -Math.max(-60, Math.min(60, p.lat))]
  }, [selected, places])

  useEffect(() => {
    const projection = geoOrthographic()
      .scale(size * RADIUS_FRACTION)
      .translate([size / 2, size / 2])
      .clipAngle(90)
      .precision(0.6)
    const path = geoPath(projection)
    const loop = { raf: 0, last: performance.now() }

    const tick = (now: number) => {
      const dt = Math.min((now - loop.last) / 1000, 0.05)
      loop.last = now
      const v = view.current
      const reduced = prefersReducedMotion()

      if (v.target) {
        const [tl, tp] = v.target
        if (reduced) v.rot = [tl, tp]
        else {
          v.rot[0] = damp(v.rot[0], v.rot[0] + angleDelta(v.rot[0], tl), 5, dt)
          v.rot[1] = damp(v.rot[1], tp, 5, dt)
        }
        if (Math.abs(angleDelta(v.rot[0], tl)) < 0.05 && Math.abs(v.rot[1] - tp) < 0.05) v.target = null
      } else if (!v.dragging && !reduced && selected === null) {
        v.rot[0] += SPIN_DEG_PER_SEC * dt
      }

      projection.rotate(v.rot)
      landRef.current?.setAttribute('d', path(land) ?? '')
      gratRef.current?.setAttribute('d', path(graticule) ?? '')

      const center: [number, number] = [-v.rot[0], -v.rot[1]]
      places.forEach((p, i) => {
        const g = markerRefs.current[i]
        if (!g) return
        const xy = projection([p.lng, p.lat])
        const front = geoDistance([p.lng, p.lat], center) < Math.PI / 2 - 0.03
        g.style.display = front && xy ? '' : 'none'
        if (xy) g.setAttribute('transform', `translate(${xy[0].toFixed(1)} ${xy[1].toFixed(1)})`)
      })

      loop.raf = requestAnimationFrame(tick)
    }
    loop.raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(loop.raf)
  }, [size, places, selected])

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    Object.assign(view.current, { dragging: true, target: null, lastX: e.clientX, lastY: e.clientY })
  }
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const v = view.current
    if (!v.dragging) return
    v.rot[0] += (e.clientX - v.lastX) * DRAG_DEG_PER_PX
    v.rot[1] = Math.max(-70, Math.min(70, v.rot[1] - (e.clientY - v.lastY) * DRAG_DEG_PER_PX))
    v.lastX = e.clientX
    v.lastY = e.clientY
  }
  const onPointerUp = () => {
    view.current.dragging = false
  }

  const r = size * RADIUS_FRACTION
  return (
    <div ref={wrapRef} className="globe">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label="Globe showing places I've been. Drag to rotate."
      >
        <defs>
          <radialGradient id="globe-ocean" cx="0.4" cy="0.35" r="0.75">
            <stop offset="0" stopColor="#0e1d3d" />
            <stop offset="1" stopColor="#040814" />
          </radialGradient>
          <radialGradient id="globe-atmo">
            <stop offset="0.86" stopColor="var(--accent)" stopOpacity="0" />
            <stop offset="0.885" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="globe-star">
            <stop offset="0" stopColor="#fff6e6" stopOpacity="1" />
            <stop offset="0.25" stopColor="var(--accent-warm)" stopOpacity="0.8" />
            <stop offset="1" stopColor="var(--accent-warm)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#globe-atmo)" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="url(#globe-ocean)" />
        <path ref={gratRef} fill="none" stroke="var(--accent)" strokeOpacity="0.08" />
        <path ref={landRef} fill="#13213f" stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="0.6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeOpacity="0.25" />
        {places.map((p, i) => (
          <g
            key={p.name}
            ref={(el) => {
              markerRefs.current[i] = el
            }}
            className={`globe-marker${selected === i ? ' is-selected' : ''}`}
            onPointerEnter={() => onSelect(i)}
            onClick={() => onSelect(i)}
          >
            <circle r="14" fill="url(#globe-star)" className="globe-marker-glow" />
            <circle r="2.6" fill="#fffaf0" />
            <circle r="9" fill="none" stroke="var(--accent-warm)" className="globe-marker-ring" />
          </g>
        ))}
      </svg>
    </div>
  )
}
