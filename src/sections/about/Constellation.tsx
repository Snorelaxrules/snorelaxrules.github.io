import { AnimatePresence, motion } from "motion/react";
import { type KeyboardEvent, useState } from "react";
import { type StarId, interests } from "../../content/aboutContent";
import { Photo } from "./Photo";

/**
 * Ursa Minor from real J2000 coordinates (RA/Dec in degrees, visual magnitude).
 * Projected azimuthally around the north celestial pole and mirrored, as seen
 * looking up at the sky.
 */
/** `label: 'left'` puts the name on the star's left, clear of lines leaving to the right. */
const STARS: {
    id: StarId;
    name: string;
    designation: string;
    ra: number;
    dec: number;
    mag: number;
    label?: "left";
}[] = [
    {
        id: "polaris",
        name: "Polaris",
        designation: "α Ursae Minoris",
        ra: 37.95,
        dec: 89.264,
        mag: 1.98,
    },
    {
        id: "yildun",
        name: "Yildun",
        designation: "δ Ursae Minoris",
        ra: 263.05,
        dec: 86.586,
        mag: 4.36,
    },
    {
        id: "epsilon",
        name: "Epsilon",
        designation: "ε Ursae Minoris",
        ra: 251.49,
        dec: 82.037,
        mag: 4.21,
    },
    {
        id: "zeta",
        name: "Zeta",
        designation: "ζ Ursae Minoris",
        ra: 236.01,
        dec: 77.795,
        mag: 4.32,
    },
    {
        id: "eta",
        name: "Eta",
        designation: "η Ursae Minoris",
        ra: 244.38,
        dec: 75.755,
        mag: 4.95,
    },
    {
        id: "pherkad",
        name: "Pherkad",
        designation: "γ Ursae Minoris",
        ra: 230.18,
        dec: 71.834,
        mag: 3.05,
    },
    {
        id: "kochab",
        name: "Kochab",
        designation: "β Ursae Minoris",
        ra: 222.68,
        dec: 74.156,
        mag: 2.08,
        label: "left",
    },
];

/** The Little Dipper: handle from Polaris, then the bowl ζ–η–γ–β–ζ. */
const LINES: [StarId, StarId][] = [
    ["polaris", "yildun"],
    ["yildun", "epsilon"],
    ["epsilon", "zeta"],
    ["zeta", "eta"],
    ["eta", "pherkad"],
    ["pherkad", "kochab"],
    ["kochab", "zeta"],
];

const PAD = 2.2;

function project(ra: number, dec: number): [number, number] {
    const r = 90 - dec;
    const t = (ra * Math.PI) / 180;
    return [-r * Math.sin(t), -r * Math.cos(t)];
}

const layout = (() => {
    const pts = Object.fromEntries(
        STARS.map((s) => [s.id, project(s.ra, s.dec)]),
    ) as Record<StarId, [number, number]>;
    const xs = Object.values(pts).map((p) => p[0]);
    const ys = Object.values(pts).map((p) => p[1]);
    const minX = Math.min(...xs) - PAD;
    const minY = Math.min(...ys) - PAD;
    // extra room on the right for star labels
    const w = Math.max(...xs) - minX + PAD + 2.4;
    const h = Math.max(...ys) - minY + PAD;
    return { pts, viewBox: `${minX} ${minY} ${w} ${h}`, minX, minY, w, h };
})();

/** faint background field, seeded so it never reshuffles */
const FIELD = (() => {
    let a = 7;
    const rnd = () => ((a = (a * 16807) % 2147483647) - 1) / 2147483646;
    return Array.from({ length: 90 }, (_, i) => ({
        i,
        x: layout.minX + rnd() * layout.w,
        y: layout.minY + rnd() * layout.h,
        r: 0.025 + rnd() ** 3 * 0.07,
        o: 0.15 + rnd() * 0.45,
    }));
})();

/** star core radius from magnitude; Polaris is boosted as the anchor */
const radiusOf = (s: (typeof STARS)[number]) =>
    s.id === "polaris" ? 0.42 : 0.1 + (5.2 - s.mag) * 0.055;

export function Constellation() {
    const [selected, setSelected] = useState<StarId>("polaris");
    const [hovered, setHovered] = useState<StarId | null>(null);
    const focus = hovered ?? selected;

    const pole = project(0, 90);
    const star = STARS.find((s) => s.id === selected)!;
    const interest = interests.find((i) => i.star === selected);

    const onStarKey = (id: StarId) => (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setSelected(id);
        }
    };

    return (
        <div className="constellation">
            <header className="constellation-head">
                <h2>Hobbies</h2>
                <p>
                    Each star of Ursa Minor holds one. Select a star to read
                    about it.
                </p>
            </header>
            <div className="star-map">
                <svg
                    viewBox={layout.viewBox}
                    role="group"
                    aria-label="Hobbies as the stars of Ursa Minor. Each star is a hobby; select one to read about it."
                >
                    <defs>
                        <radialGradient id="star-glow">
                            <stop
                                offset="0"
                                stopColor="#fff8ec"
                                stopOpacity="0.9"
                            />
                            <stop
                                offset="0.25"
                                stopColor="var(--accent)"
                                stopOpacity="0.35"
                            />
                            <stop
                                offset="1"
                                stopColor="var(--accent)"
                                stopOpacity="0"
                            />
                        </radialGradient>
                        <radialGradient id="star-glow-warm">
                            <stop
                                offset="0"
                                stopColor="#fff8ec"
                                stopOpacity="1"
                            />
                            <stop
                                offset="0.25"
                                stopColor="var(--accent-warm)"
                                stopOpacity="0.45"
                            />
                            <stop
                                offset="1"
                                stopColor="var(--accent-warm)"
                                stopOpacity="0"
                            />
                        </radialGradient>
                    </defs>

                    {/* declination circles around the celestial pole */}
                    <g className="sky-grid" aria-hidden="true">
                        {[3, 6, 9, 12, 15, 18].map((r) => (
                            <circle key={r} cx={pole[0]} cy={pole[1]} r={r} />
                        ))}
                    </g>
                    <g aria-hidden="true">
                        {FIELD.map((f) => (
                            <circle
                                key={f.i}
                                cx={f.x}
                                cy={f.y}
                                r={f.r}
                                fill="#cfe0ff"
                                opacity={f.o}
                            />
                        ))}
                    </g>

                    <g className="star-lines" aria-hidden="true">
                        {LINES.map(([a, b]) => (
                            <line
                                key={a + b}
                                x1={layout.pts[a][0]}
                                y1={layout.pts[a][1]}
                                x2={layout.pts[b][0]}
                                y2={layout.pts[b][1]}
                                className={
                                    a === focus || b === focus
                                        ? "is-lit"
                                        : undefined
                                }
                            />
                        ))}
                    </g>

                    {STARS.map((s, i) => {
                        const [x, y] = layout.pts[s.id];
                        const r = radiusOf(s);
                        const anchor = s.id === "polaris";
                        return (
                            <g
                                key={s.id}
                                className={`star${s.id === focus ? " is-focus" : ""}${s.id === selected ? " is-selected" : ""}${anchor ? " is-anchor" : ""}`}
                                role="button"
                                tabIndex={0}
                                aria-label={`${s.name}: ${interests.find((it) => it.star === s.id)?.title ?? "uncharted"}`}
                                aria-pressed={s.id === selected}
                                onClick={() => setSelected(s.id)}
                                onKeyDown={onStarKey(s.id)}
                                onPointerEnter={() => setHovered(s.id)}
                                onPointerLeave={() => setHovered(null)}
                                onFocus={() => setHovered(s.id)}
                                onBlur={() => setHovered(null)}
                            >
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={Math.max(r * 4, 0.9)}
                                    fill="transparent"
                                />
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={r * (anchor ? 7 : 5)}
                                    fill={
                                        anchor
                                            ? "url(#star-glow-warm)"
                                            : "url(#star-glow)"
                                    }
                                    className="star-glow"
                                    style={{ animationDelay: `${-i * 0.73}s` }}
                                />
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={r}
                                    className="star-core"
                                />
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={r * 2.6}
                                    className="star-ring"
                                />
                                <text
                                    x={
                                        s.label === "left"
                                            ? x - r - 0.45
                                            : x + r * (anchor ? 2.6 : 1) + 0.45
                                    }
                                    y={y + 0.2}
                                    textAnchor={
                                        s.label === "left" ? "end" : undefined
                                    }
                                    className="star-label"
                                >
                                    {s.name}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>

            <div className="star-card-slot" aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.article
                        key={selected}
                        className="star-card"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25 }}
                    >
                        <p className="star-card-name">
                            {star.name} <span>· {star.designation}</span>
                        </p>
                        <h2>{interest?.title ?? "Uncharted"}</h2>
                        {interest?.photo && (
                            <Photo
                                key={interest.photo}
                                src={interest.photo}
                                alt={interest.title}
                                seed={star.id}
                                className="star-card-photo"
                            />
                        )}
                        <p>
                            {interest?.text ??
                                "Nothing logged for this star yet."}
                        </p>
                        {star.id === "polaris" && (
                            <p className="star-card-note">
                                North star — everything else turns around this
                                one.
                            </p>
                        )}
                    </motion.article>
                </AnimatePresence>
                <p className="star-hint">
                    Select a star · Polaris is the main one
                </p>
            </div>
        </div>
    );
}
