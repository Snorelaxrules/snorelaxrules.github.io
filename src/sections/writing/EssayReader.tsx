import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { type Essay, formatDate, neighbors } from "../../content/writing";
import { EssayBody, EssayImage } from "./EssayBody";
import {
    FONT_SIZES,
    type FontSize,
    loadFontSize,
    saveFontSize,
} from "./readerPrefs";
import { ReadingProgress } from "./ReadingProgress";

const isTyping = (t: EventTarget | null) =>
    t instanceof HTMLElement &&
    (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/** Reader controls: a small "Aa" menu with the font size (S / M / L). */
function ReaderMenu({
    size,
    onSize,
    open,
    setOpen,
}: {
    size: FontSize;
    onSize: (s: FontSize) => void;
    open: boolean;
    setOpen: (o: boolean) => void;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    // a click anywhere else closes it
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, [open, setOpen]);

    return (
        <div ref={rootRef} className="reader-menu">
            <button
                type="button"
                className="reader-menu-toggle"
                aria-expanded={open}
                aria-controls={menuId}
                aria-label="Reading options"
                title="Reading options"
                onClick={() => setOpen(!open)}
            >
                <span aria-hidden="true">
                    A<small>a</small>
                </span>
            </button>
            {open && (
                <div id={menuId} className="reader-menu-panel">
                    <p className="reader-menu-label" id={`${menuId}-size`}>
                        Text size
                    </p>
                    <div
                        className="reader-sizes"
                        role="radiogroup"
                        aria-labelledby={`${menuId}-size`}
                    >
                        {FONT_SIZES.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                role="radio"
                                aria-checked={size === s.id}
                                aria-label={s.name}
                                className={`size-${s.id}${size === s.id ? " is-on" : ""}`}
                                onClick={() => onSize(s.id)}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/** One essay: header, body, and older/newer links. Esc returns to the list. */
export function EssayReader({
    essay,
    indexRoute,
}: {
    essay: Essay;
    indexRoute: string;
}) {
    const navigate = useNavigate();
    const articleRef = useRef<HTMLElement>(null);
    const [size, setSize] = useState<FontSize>(loadFontSize);
    const [menuOpen, setMenuOpen] = useState(false);
    const [coverFailed, setCoverFailed] = useState(false);
    const { older, newer } = neighbors(essay.slug);

    // Esc: close the reader menu, else back to the essay list (before the page's
    // own Esc, which would leave Writing altogether)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (
                e.key !== "Escape" ||
                e.metaKey ||
                e.ctrlKey ||
                e.altKey ||
                isTyping(e.target)
            )
                return;
            e.preventDefault();
            e.stopPropagation();
            if (menuOpen) setMenuOpen(false);
            else navigate(indexRoute);
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
    }, [navigate, indexRoute, menuOpen]);

    // focus the article so Space / arrows / Page Down scroll the text. (The page
    // focuses its Back to galaxy button on open, where Space would click it; this
    // runs a frame later.) Each essay mounts fresh: Writing keys this on the slug.
    useEffect(() => {
        const raf = requestAnimationFrame(() =>
            articleRef.current?.focus({ preventScroll: true }),
        );
        return () => cancelAnimationFrame(raf);
    }, []);

    const pickSize = (s: FontSize) => {
        setSize(s);
        saveFontSize(s);
    };

    return (
        <>
            <ReadingProgress articleRef={articleRef} />
            <article
                ref={articleRef}
                className={`essay essay-size-${size}`}
                aria-labelledby="essay-title"
                tabIndex={-1}
            >
                <div className="essay-panel">
                    <div className="essay-column">
                        <div className="essay-topbar">
                            <Link to={indexRoute} className="essay-back">
                                <span aria-hidden="true">←</span> Essays
                            </Link>
                            <ReaderMenu
                                size={size}
                                onSize={pickSize}
                                open={menuOpen}
                                setOpen={setMenuOpen}
                            />
                        </div>

                        <header className="essay-head">
                            <p className="essay-meta">
                                <time dateTime={essay.date}>
                                    {formatDate(essay.date)}
                                </time>
                                <span aria-hidden="true"> · </span>
                                <span>{essay.readMinutes} min read</span>
                            </p>
                            <h1 id="essay-title">{essay.title}</h1>
                            {essay.summary && (
                                <p className="essay-dek">{essay.summary}</p>
                            )}
                        </header>

                        {/* the cover is decorative (the title says what the essay is); a missing file is simply left out */}
                        {essay.cover && !coverFailed && (
                            <figure className="essay-cover">
                                <EssayImage
                                    src={essay.cover}
                                    alt=""
                                    onFail={() => setCoverFailed(true)}
                                />
                            </figure>
                        )}

                        <div className="essay-body">
                            <EssayBody markdown={essay.body} />
                        </div>

                        <footer className="essay-foot">
                            <nav
                                className="essay-pager"
                                aria-label="More essays"
                            >
                                {older ? (
                                    <Link
                                        to={`${indexRoute}/${older.slug}`}
                                        className="essay-pager-link is-older"
                                        rel="prev"
                                    >
                                        <span className="essay-pager-dir">
                                            ← Previous essay
                                        </span>
                                        <span className="essay-pager-title">
                                            {older.title}
                                        </span>
                                    </Link>
                                ) : (
                                    <span />
                                )}
                                {newer ? (
                                    <Link
                                        to={`${indexRoute}/${newer.slug}`}
                                        className="essay-pager-link is-newer"
                                        rel="next"
                                    >
                                        <span className="essay-pager-dir">
                                            Next essay →
                                        </span>
                                        <span className="essay-pager-title">
                                            {newer.title}
                                        </span>
                                    </Link>
                                ) : (
                                    <span />
                                )}
                            </nav>
                            <Link to={indexRoute} className="essay-all">
                                <span aria-hidden="true">←</span> Back to essays
                            </Link>
                        </footer>
                    </div>
                </div>
            </article>
        </>
    );
}
