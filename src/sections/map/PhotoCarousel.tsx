import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Place, ResolvedPhoto } from "../../content/data";
import { useFocusTrap } from "./focusTrap";

interface Props {
    photos: ResolvedPhoto[];
    placeName: string;
    index: number;
    onIndex: (i: number) => void;
    lightbox: boolean;
    onLightbox: (open: boolean) => void;
}

const altFor = (p: ResolvedPhoto, place: string, i: number, n: number) =>
    p.caption ??
    (p.spot
        ? `${p.spot}, ${place}`
        : n > 1
          ? `${place}, photo ${i + 1} of ${n}`
          : place);

/** One photo, fading in once loaded; a quiet note if it is missing or broken. */
function Shot({
    photo,
    alt,
    className,
}: {
    photo: ResolvedPhoto;
    alt: string;
    className: string;
}) {
    const [state, setState] = useState<"loading" | "ok" | "failed">(
        photo.src ? "loading" : "failed",
    );
    if (state === "failed")
        return (
            <div
                className={`${className} is-missing`}
                role="img"
                aria-label={alt}
            >
                <span>Photo unavailable</span>
            </div>
        );
    return (
        <img
            className={`${className}${state === "ok" ? " is-loaded" : ""}`}
            src={photo.src!}
            alt={alt}
            decoding="async"
            onLoad={() => setState("ok")}
            onError={() => setState("failed")}
        />
    );
}

function Arrows({
    n,
    index,
    onIndex,
    size,
}: {
    n: number;
    index: number;
    onIndex: (i: number) => void;
    size: string;
}) {
    if (n < 2) return null;
    return (
        <>
            <button
                type="button"
                className={`carousel-arrow is-prev ${size}`}
                aria-label="Previous photo"
                onClick={() => onIndex((index - 1 + n) % n)}
            >
                ‹
            </button>
            <button
                type="button"
                className={`carousel-arrow is-next ${size}`}
                aria-label="Next photo"
                onClick={() => onIndex((index + 1) % n)}
            >
                ›
            </button>
        </>
    );
}

function Lightbox({
    photos,
    placeName,
    index,
    onIndex,
    onClose,
}: Omit<Props, "lightbox" | "onLightbox"> & { onClose: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const n = photos.length;
    const photo = photos[index];
    useFocusTrap(ref, true);
    useEffect(() => {
        ref.current?.querySelector<HTMLElement>(".lightbox-close")?.focus();
    }, []);

    // Esc closes just the lightbox, before the app's Esc leaves the section
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            e.stopPropagation();
            onClose();
        };
        window.addEventListener("keydown", onKey, { capture: true });
        return () =>
            window.removeEventListener("keydown", onKey, { capture: true });
    }, [onClose]);

    return createPortal(
        <div
            ref={ref}
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`${placeName} photos`}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            onKeyDown={(e) => {
                if (n < 2) return;
                if (e.key === "ArrowLeft") onIndex((index - 1 + n) % n);
                if (e.key === "ArrowRight") onIndex((index + 1) % n);
            }}
        >
            <button
                type="button"
                className="lightbox-close"
                aria-label="Close photo"
                onClick={onClose}
            >
                ×
            </button>
            <figure
                className="lightbox-figure"
                onClick={(e) => e.target === e.currentTarget && onClose()}
            >
                <Shot
                    key={photo.src ?? index}
                    photo={photo}
                    alt={altFor(photo, placeName, index, n)}
                    className="lightbox-img"
                />
                {(photo.caption || photo.spot || n > 1) && (
                    <figcaption>
                        {photo.spot && (
                            <span className="carousel-spot">{photo.spot}</span>
                        )}
                        {photo.caption}
                        {n > 1 && (
                            <span className="carousel-count">{`${index + 1} / ${n}`}</span>
                        )}
                    </figcaption>
                )}
            </figure>
            <Arrows n={n} index={index} onIndex={onIndex} size="is-large" />
        </div>,
        document.body,
    );
}

/** Main photo, arrows, thumbnails, caption; the lightbox shares the same index. */
export function PhotoCarousel({
    photos,
    placeName,
    index,
    onIndex,
    lightbox,
    onLightbox,
}: Props) {
    const n = photos.length;
    const photo = photos[index];
    const mainRef = useRef<HTMLButtonElement>(null);
    const thumbsRef = useRef<HTMLDivElement>(null);

    // warm the cache for the next photo; the rest load when asked for
    useEffect(() => {
        const next = photos[(index + 1) % n];
        if (n > 1 && next.src) new Image().src = next.src;
    }, [photos, index, n]);

    useEffect(() => {
        // scroll only the strip sideways; scrollIntoView would also scroll the panel and page
        const strip = thumbsRef.current;
        const thumb = strip?.querySelector<HTMLElement>(
            '[aria-current="true"]',
        );
        if (!strip || !thumb) return;
        const left = thumb.offsetLeft - strip.offsetLeft;
        if (left < strip.scrollLeft)
            strip.scrollTo({ left, behavior: "smooth" });
        else if (
            left + thumb.offsetWidth >
            strip.scrollLeft + strip.clientWidth
        )
            strip.scrollTo({
                left: left + thumb.offsetWidth - strip.clientWidth,
                behavior: "smooth",
            });
    }, [index]);

    // however the lightbox closed (button, backdrop, Esc), focus returns to the photo
    const wasOpen = useRef(false);
    useEffect(() => {
        if (wasOpen.current && !lightbox) mainRef.current?.focus();
        wasOpen.current = lightbox;
    }, [lightbox]);
    const closeLightbox = () => onLightbox(false);

    return (
        <div
            className="carousel"
            aria-roledescription="carousel"
            aria-label={`${placeName} photos`}
        >
            <div className="carousel-stage">
                <button
                    ref={mainRef}
                    type="button"
                    className="carousel-main"
                    aria-label={`Open photo ${n > 1 ? `${index + 1} of ${n} ` : ""}full screen`}
                    onClick={() => onLightbox(true)}
                >
                    <Shot
                        key={photo.src ?? index}
                        photo={photo}
                        alt={altFor(photo, placeName, index, n)}
                        className="carousel-img"
                    />
                </button>
                <Arrows n={n} index={index} onIndex={onIndex} size="" />
            </div>
            {(photo.caption || photo.spot || n > 1) && (
                <p className="carousel-caption" aria-live="polite">
                    <span>
                        {photo.spot && (
                            <span className="carousel-spot">{photo.spot}</span>
                        )}
                        {photo.caption}
                    </span>
                    {n > 1 && (
                        <span className="carousel-count">{`${index + 1} / ${n}`}</span>
                    )}
                </p>
            )}
            {n > 1 && (
                <div ref={thumbsRef} className="carousel-thumbs">
                    {photos.map((p, i) => (
                        <button
                            key={`${p.file}-${i}`}
                            type="button"
                            className="carousel-thumb"
                            aria-label={`Show photo ${i + 1}${p.caption ? `: ${p.caption}` : ""}`}
                            aria-current={i === index}
                            onClick={() => onIndex(i)}
                        >
                            {p.thumb ? (
                                <img
                                    src={p.thumb}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <span aria-hidden="true">?</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
            {lightbox && (
                <Lightbox
                    photos={photos}
                    placeName={placeName}
                    index={index}
                    onIndex={onIndex}
                    onClose={closeLightbox}
                />
            )}
        </div>
    );
}

/** A place's photos; the parent owns the index so the globe can follow it. */
export function PlacePhotos({
    place,
    photos,
    index,
    onIndex,
}: {
    place: Place;
    photos: ResolvedPhoto[];
    index: number;
    onIndex: (i: number) => void;
}) {
    const [lightbox, setLightbox] = useState(false);
    const n = photos.length;
    if (!n) return null;
    return (
        <div
            onKeyDown={(e) => {
                if (lightbox || n < 2) return;
                if (e.key === "ArrowLeft") onIndex((index - 1 + n) % n);
                if (e.key === "ArrowRight") onIndex((index + 1) % n);
            }}
        >
            <PhotoCarousel
                photos={photos}
                placeName={place.name}
                index={index}
                onIndex={onIndex}
                lightbox={lightbox}
                onLightbox={setLightbox}
            />
        </div>
    );
}
