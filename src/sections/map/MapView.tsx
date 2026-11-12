import {
    AttributionControl,
    LngLatBounds,
    Map as MapLibre,
    Marker,
    setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef, useState } from "react";
import type { Place } from "../../content/data";
import { prefersReducedMotion } from "../../scene/pointer";
import { mapStyle } from "./mapStyle";

// MapLibre looks for its tile worker next to its own module, which no longer
// exists once bundled; ship the (self-contained) worker as an asset instead
setWorkerUrl(workerUrl);

/** the zoomed-out globe fills this much of the map box's shorter side */
const GLOBE_FILL = 0.82;
/** zoom at which the globe's diameter (512·2^z/π px) fills the box */
const worldZoom = (el: HTMLElement) =>
    Math.log2(
        (GLOBE_FILL * Math.min(el.clientWidth, el.clientHeight) * Math.PI) /
            512,
    );
const START_CENTER: [number, number] = [-40, 28];
/** deepest zoom when framing a place's photo spots */
const MAX_PLACE_ZOOM = 12;
/** zoom for a place with one photo spot, or none */
const SINGLE_SPOT_ZOOM = 10;
const PLACE_ZOOM = 5;
const SPIN_DEG_PER_SEC = 4;
/** after the user drags or zooms, the idle spin waits this long */
const SPIN_RESUME_MS = 6000;

export interface MapFocus {
    /** [lng, lat] to centre on; with `fit`, the current photo's spot, kept in view */
    at: [number, number];
    /** frame these [lng, lat] points (a place's photo spots) */
    fit?: [number, number][];
    /** keep the current zoom (hovering), instead of zooming to the place */
    pan?: boolean;
}

interface Props {
    places: Place[];
    highlighted: number | null;
    openPlace: number | null;
    focus: MapFocus | null;
    spots: [number, number][];
    activeSpot: number | null;
    onSelect: (i: number) => void;
    onHover: (i: number) => void;
    onHoverEnd: () => void;
    onSpot: (i: number) => void;
}

function starButton(label: string, className: string) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = className;
    el.setAttribute("aria-label", label);
    el.innerHTML =
        '<span class="map-star-glow"></span><span class="map-star-core"></span><span class="map-star-ring"></span>';
    return el;
}

/**
 * MapLibre GL map with the globe projection: a 3D globe zoomed out, a detailed
 * map zoomed in. Place stars and photo spots are DOM markers so they stay
 * focusable buttons. The map (and its WebGL context) is removed on unmount.
 */
export function MapView(props: Props) {
    const { places, highlighted, openPlace, focus, spots, activeSpot } = props;
    const boxRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<MapLibre | null>(null);
    const placeEls = useRef<HTMLButtonElement[]>([]);
    const spotEls = useRef<HTMLButtonElement[]>([]);
    // handlers read through a ref so markers needn't be rebuilt when they change
    const cb = useRef(props);
    useEffect(() => {
        cb.current = props;
    });
    const spin = useRef({ lastInteraction: 0, focused: false });

    useEffect(() => {
        const container = boxRef.current;
        if (!container) return;
        const m = new MapLibre({
            container,
            style: mapStyle,
            center: START_CENTER,
            zoom: worldZoom(container),
            minZoom: 0.6,
            maxZoom: 16,
            attributionControl: false,
            dragRotate: false,
            pitchWithRotate: false,
            touchPitch: false,
            renderWorldCopies: false,
            fadeDuration: 150,
        });
        m.touchZoomRotate.disableRotation();
        m.keyboard.disableRotation();
        m.addControl(new AttributionControl({ compact: true }), "bottom-right");
        const touched = () => {
            spin.current.lastInteraction = performance.now();
        };
        m.on("dragstart", touched);
        m.on("wheel", touched);
        m.on("touchstart", touched);
        setMap(m);

        // the section page animates in, so the box can change size after the map
        // measured it; without this the camera centre and markers drift off
        const ro = new ResizeObserver(() => m.resize());
        ro.observe(container);

        // idle spin while nothing is open and the globe is zoomed out
        const loop = { raf: 0, last: performance.now() };
        const tick = (now: number) => {
            const dt = Math.min((now - loop.last) / 1000, 0.05);
            loop.last = now;
            const s = spin.current;
            if (
                !s.focused &&
                !prefersReducedMotion() &&
                now - s.lastInteraction > SPIN_RESUME_MS &&
                !m.isMoving() &&
                m.getZoom() < 2.5
            ) {
                const c = m.getCenter();
                m.setCenter([c.lng + SPIN_DEG_PER_SEC * dt, c.lat]);
            }
            loop.raf = requestAnimationFrame(tick);
        };
        loop.raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(loop.raf);
            ro.disconnect();
            m.remove();
            setMap(null);
        };
    }, []);

    // place stars
    useEffect(() => {
        if (!map) return;
        const markers = places.map((p, i) => {
            const el = starButton(p.name, "map-star");
            el.addEventListener("pointerenter", () => cb.current.onHover(i));
            el.addEventListener("pointerleave", () => cb.current.onHoverEnd());
            el.addEventListener("focus", () => cb.current.onHover(i));
            el.addEventListener("click", (e) => {
                e.stopPropagation();
                cb.current.onSelect(i);
            });
            return new Marker({ element: el, opacityWhenCovered: "0" })
                .setLngLat([p.lng, p.lat])
                .addTo(map);
        });
        placeEls.current = markers.map(
            (mk) => mk.getElement() as HTMLButtonElement,
        );
        return () => markers.forEach((mk) => mk.remove());
    }, [map, places]);

    useEffect(() => {
        placeEls.current.forEach((el, i) => {
            el.classList.toggle("is-selected", i === highlighted);
            el.setAttribute("aria-pressed", String(i === openPlace));
            // an open place with photo spots shows those instead of its own star
            el.classList.toggle(
                "is-hidden",
                i === openPlace && spots.length > 0,
            );
        });
    }, [highlighted, openPlace, spots, map, places]);

    // photo spots of the open place
    useEffect(() => {
        if (!map) return;
        const markers = spots.map((at, i) => {
            const el = starButton(`Photo spot ${i + 1}`, "map-star is-spot");
            el.addEventListener("click", (e) => {
                e.stopPropagation();
                cb.current.onSpot(i);
            });
            return new Marker({ element: el, opacityWhenCovered: "0" })
                .setLngLat(at)
                .addTo(map);
        });
        spotEls.current = markers.map(
            (mk) => mk.getElement() as HTMLButtonElement,
        );
        return () => markers.forEach((mk) => mk.remove());
    }, [map, spots]);

    useEffect(() => {
        spotEls.current.forEach((el, i) =>
            el.classList.toggle("is-active", i === activeSpot),
        );
    }, [activeSpot, spots, map]);

    // camera
    const lastFit = useRef("");
    useEffect(() => {
        if (!map) return;
        const reduced = prefersReducedMotion();
        spin.current.focused = focus !== null;
        const move = (center: [number, number], zoom: number, fly: boolean) => {
            if (reduced) map.jumpTo({ center, zoom });
            else if (fly)
                map.flyTo({
                    center,
                    zoom,
                    speed: 1.4,
                    curve: 1.5,
                    essential: true,
                });
            else map.easeTo({ center, zoom, duration: 900, essential: true });
        };

        if (!focus) {
            lastFit.current = "";
            const world = worldZoom(map.getContainer());
            if (map.getZoom() > world + 0.3)
                move(
                    [
                        map.getCenter().lng,
                        Math.max(-50, Math.min(50, map.getCenter().lat)),
                    ],
                    world,
                    true,
                );
            spin.current.lastInteraction =
                performance.now() - SPIN_RESUME_MS + 1500;
            return;
        }
        if (focus.pan) {
            move(focus.at, map.getZoom(), false);
            return;
        }
        const key = JSON.stringify(focus.fit ?? focus.at);
        if (key === lastFit.current) {
            // stepping through photos of the open place: pan only if the spot left the view
            const pt = map.project(focus.at);
            const { clientWidth: w, clientHeight: h } = map.getContainer();
            if (pt.x < 40 || pt.y < 40 || pt.x > w - 40 || pt.y > h - 40)
                move(focus.at, map.getZoom(), false);
            return;
        }
        lastFit.current = key;
        // arriving at a place: frame all its photo spots
        if (focus.fit && focus.fit.length > 1) {
            const bounds = focus.fit.reduce(
                (b, p) => b.extend(p),
                new LngLatBounds(focus.fit[0], focus.fit[0]),
            );
            // the centre comes from the bounds themselves; cameraForBounds' centre drifts on the globe
            const zoom =
                map.cameraForBounds(bounds, { padding: 70 })?.zoom ??
                SINGLE_SPOT_ZOOM;
            const c = bounds.getCenter();
            move([c.lng, c.lat], Math.min(zoom, MAX_PLACE_ZOOM), true);
        } else
            move(
                focus.at,
                focus.fit?.length === 1 ? SINGLE_SPOT_ZOOM : PLACE_ZOOM,
                true,
            );
    }, [focus, map]);

    return (
        <div className="map-view">
            <div
                ref={boxRef}
                className="map-canvas"
                role="region"
                aria-label="Map of places I've been. Drag to pan, scroll or pinch to zoom."
            />
        </div>
    );
}
