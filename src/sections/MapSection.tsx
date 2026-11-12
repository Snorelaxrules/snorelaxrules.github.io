import { useEffect, useMemo, useRef, useState } from "react";
import { placePhotos, places } from "../content/data";
import { type MapFocus, MapView } from "./map/MapView";
import { PlacePhotos } from "./map/PhotoCarousel";
import "./map/map.css";
import { SectionHeader } from "./SectionHeader";
import type { SectionProps } from "./types";

/** how long the pointer must rest on a star (or list row) before the globe turns */
const GLOBE_HOVER_MS = 450;
const LIST_HOVER_MS = 200;

/**
 * Hovering a star (or a list row) turns the globe to it; clicking opens that
 * place, with its photos, in the right column in place of the list.
 */
export default function MapSection({ cluster }: SectionProps) {
    const [hovered, setHovered] = useState<number | null>(null);
    // hover intent: the globe only turns once the pointer rests on a star, so
    // gliding across it doesn't yank it around
    const hoverTimer = useRef(0);
    const hoverSoon = (i: number | null, delay: number) => {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = window.setTimeout(() => setHovered(i), delay);
    };
    const hoverCancel = () => window.clearTimeout(hoverTimer.current);
    useEffect(() => hoverCancel, []);
    const [open, setOpen] = useState<number | null>(null);
    const shown = open ?? hovered;
    const current = shown === null ? null : places[shown];
    const opened = open === null ? null : places[open];
    const backRef = useRef<HTMLButtonElement>(null);
    const [photo, setPhoto] = useState(0);

    // the open place's photos, and the distinct spots they were taken at
    const photos = useMemo(() => (opened ? placePhotos(opened) : []), [opened]);
    const { spots, spotOf } = useMemo(() => {
        const list: [number, number][] = [];
        const of = photos.map((p) => {
            if (!p.at) return null;
            const same = list.findIndex(
                (s) => s[0] === p.at![0] && s[1] === p.at![1],
            );
            if (same >= 0) return same;
            list.push(p.at);
            return list.length - 1;
        });
        return { spots: list, spotOf: of };
    }, [photos]);

    const focus = useMemo<MapFocus | null>(() => {
        if (opened) {
            const at = photos[photo]?.at ?? [opened.lng, opened.lat];
            return { at, fit: spots.length ? spots : undefined };
        }
        if (hovered !== null)
            return {
                at: [places[hovered].lng, places[hovered].lat],
                pan: true,
            };
        return null;
    }, [hovered, opened, photos, photo, spots]);
    // named spots (subsections) in photo order, each opening at its first photo
    const spotNames = useMemo(() => {
        const seen = new Map<string, number>();
        photos.forEach((p, i) => {
            if (p.spot && !seen.has(p.spot)) seen.set(p.spot, i);
        });
        return [...seen].map(([name, first]) => ({ name, first }));
    }, [photos]);
    const listOpener = useRef<number | null>(null);

    const openPlace = (i: number) => {
        hoverCancel();
        setHovered(null);
        setPhoto(0);
        setOpen(i);
    };
    const close = () => {
        listOpener.current = open;
        setOpen(null);
    };

    // focus moves into the opened place, and back to its list row on close
    useEffect(() => {
        if (open !== null) backRef.current?.focus({ preventScroll: true });
        else if (listOpener.current !== null) {
            document
                .querySelector<HTMLElement>(
                    `[data-place-index="${listOpener.current}"]`,
                )
                ?.focus({ preventScroll: true });
            listOpener.current = null;
        }
    }, [open]);

    // Esc closes the opened place before the app's Esc leaves the section
    // (the lightbox, when open, catches Esc first)
    useEffect(() => {
        if (open === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape" || document.querySelector(".lightbox"))
                return;
            e.stopPropagation();
            listOpener.current = open;
            setOpen(null);
        };
        window.addEventListener("keydown", onKey, { capture: true });
        return () =>
            window.removeEventListener("keydown", onKey, { capture: true });
    }, [open]);

    return (
        <>
            <SectionHeader kicker={cluster.subtitle} title={cluster.label}>
                <p>
                    {places.length} stops so far. Hover a star to turn the
                    globe, click it for photos, zoom in for detail.
                </p>
            </SectionHeader>
            <div className="map-layout">
                <div className="map-globe">
                    <MapView
                        places={places}
                        highlighted={shown}
                        focus={focus}
                        spots={spots}
                        activeSpot={spotOf[photo] ?? null}
                        openPlace={open}
                        // while a place is open the globe stays on it; hovering other stars does nothing
                        onHover={(i) =>
                            open === null && hoverSoon(i, GLOBE_HOVER_MS)
                        }
                        onHoverEnd={hoverCancel}
                        onSelect={openPlace}
                        onSpot={(i) => setPhoto(Math.max(0, spotOf.indexOf(i)))}
                    />
                    <div className="map-detail" aria-live="polite">
                        {current ? (
                            <>
                                <p className="map-detail-date">
                                    {current.date}
                                </p>
                                <h2>{current.name}</h2>
                            </>
                        ) : (
                            <p className="muted">
                                Hover a star, click for details.
                            </p>
                        )}
                    </div>
                </div>
                {opened ? (
                    <div className="place-open">
                        <button
                            ref={backRef}
                            type="button"
                            className="place-open-back"
                            onClick={close}
                        >
                            <span aria-hidden="true">←</span> All places
                        </button>
                        <p className="map-detail-date">{opened.date}</p>
                        <h2>{opened.name}</h2>
                        <p className="place-open-note">{opened.note}</p>
                        {spotNames.length > 1 && (
                            <div
                                className="place-spots"
                                role="group"
                                aria-label="Spots"
                            >
                                {spotNames.map((sp) => (
                                    <button
                                        key={sp.name}
                                        type="button"
                                        className="place-spot"
                                        aria-current={
                                            photos[photo]?.spot === sp.name
                                        }
                                        onClick={() => setPhoto(sp.first)}
                                    >
                                        {sp.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <PlacePhotos
                            key={opened.slug}
                            place={opened}
                            photos={photos}
                            index={photo}
                            onIndex={setPhoto}
                        />
                    </div>
                ) : (
                    <ol
                        className="place-list"
                        onPointerLeave={() => {
                            hoverCancel();
                            setHovered(null);
                        }}
                    >
                        {places.map((p, i) => (
                            <li key={p.slug}>
                                <button
                                    type="button"
                                    data-place-index={i}
                                    onPointerEnter={() =>
                                        hoverSoon(i, LIST_HOVER_MS)
                                    }
                                    onFocus={() => setHovered(i)}
                                    onClick={() => openPlace(i)}
                                >
                                    <span className="place-name">{p.name}</span>
                                    <span className="muted">
                                        {p.date}
                                        {p.photos.length > 0 &&
                                            ` · ${p.photos.length} photo${p.photos.length > 1 ? "s" : ""}`}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ol>
                )}
            </div>
        </>
    );
}
