import { Color } from "three";
import type { ClusterConfig } from "../../content/clusters";

/** Deterministic RNG so each cluster looks the same on every visit. */
function mulberry32(seed: number) {
    let a = seed;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashString(s: string) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++)
        h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
}

const DEFAULT_COUNT: Record<ClusterConfig["kind"], number> = {
    spiral: 16000,
    elliptical: 10000,
    globular: 6000,
    beacon: 8000,
};

export interface ClusterBuffers {
    positions: Float32Array;
    colors: Float32Array;
    sizes: Float32Array;
    /** normalized distance from the center, 0..1 (used for the beacon pulse) */
    radii: Float32Array;
}

export function generateCluster(cfg: ClusterConfig): ClusterBuffers {
    const rng = mulberry32(hashString(cfg.id));
    const gauss = () =>
        Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
    const n = cfg.particles ?? DEFAULT_COUNT[cfg.kind];
    const R = cfg.size;
    const arms = cfg.arms ?? 2;

    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const radii = new Float32Array(n);

    const core = new Color(cfg.coreColor ?? "#ffe3bd");
    const main = new Color(cfg.color);
    const hot = new Color("#d6e8ff");
    const c = new Color();

    for (let i = 0; i < n; i++) {
        let x = 0;
        let y = 0;
        let z = 0;
        let rn = 0;
        let brightness = 0.45 + rng() * 0.55;
        let size = 0.7 + rng() ** 4 * 2.4;

        switch (cfg.kind) {
            case "spiral": {
                const roll = rng();
                if (roll < 0.16) {
                    // central bulge
                    const r = Math.abs(gauss()) * R * 0.11;
                    const th = rng() * Math.PI * 2;
                    const ph = Math.acos(2 * rng() - 1);
                    x = r * Math.sin(ph) * Math.cos(th);
                    y = r * Math.cos(ph) * 0.6;
                    z = r * Math.sin(ph) * Math.sin(th);
                    rn = r / R;
                    brightness += 0.3;
                } else if (roll < 0.3) {
                    // diffuse disk between the arms
                    const r = R * Math.sqrt(rng());
                    const th = rng() * Math.PI * 2;
                    x = Math.cos(th) * r;
                    z = Math.sin(th) * r;
                    y = gauss() * R * 0.02;
                    rn = r / R;
                    brightness *= 0.45;
                } else {
                    // arms: a log-ish spiral with spread that loosens toward the rim
                    const arm = Math.floor(rng() * arms);
                    rn = 0.05 + 0.95 * rng() ** 0.85;
                    const r = rn * R;
                    const th =
                        (arm / arms) * Math.PI * 2 +
                        rn * 5.2 +
                        gauss() * 0.26 * (1.15 - rn * 0.5);
                    x = Math.cos(th) * r + gauss() * R * 0.035;
                    z = Math.sin(th) * r + gauss() * R * 0.035;
                    y = gauss() * R * 0.025 * (1 - rn * 0.6);
                }
                break;
            }
            case "elliptical": {
                x = gauss() * R * 0.42;
                y = gauss() * R * 0.24;
                z = gauss() * R * 0.34;
                rn = Math.min(
                    1,
                    Math.hypot(x / 0.42, y / 0.24, z / 0.34) / R / 2.2,
                );
                break;
            }
            case "globular": {
                // Plummer sphere, truncated
                const a = R * 0.22;
                const r = Math.min(
                    R,
                    a / Math.sqrt(Math.max(rng() ** (-2 / 3) - 1, 1e-4)),
                );
                const th = rng() * Math.PI * 2;
                const ph = Math.acos(2 * rng() - 1);
                x = r * Math.sin(ph) * Math.cos(th);
                y = r * Math.cos(ph);
                z = r * Math.sin(ph) * Math.sin(th);
                rn = r / R;
                break;
            }
            case "beacon": {
                if (rng() < 0.35) {
                    const r = Math.abs(gauss()) * R * 0.1;
                    const th = rng() * Math.PI * 2;
                    const ph = Math.acos(2 * rng() - 1);
                    x = r * Math.sin(ph) * Math.cos(th);
                    y = r * Math.cos(ph);
                    z = r * Math.sin(ph) * Math.sin(th);
                    rn = r / R;
                    brightness += 0.1;
                    size *= 0.8;
                } else {
                    rn = 0.25 + 0.75 * rng();
                    const th = rng() * Math.PI * 2;
                    x = Math.cos(th) * rn * R;
                    z = Math.sin(th) * rn * R;
                    y = gauss() * R * 0.012;
                    brightness *= 0.8;
                    size *= 0.85;
                }
                break;
            }
        }

        c.copy(core).lerp(main, Math.min(1, rn / 0.55));
        if (rng() < 0.05) c.copy(hot);
        c.multiplyScalar(Math.min(brightness, 1.2));

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
        sizes[i] = size;
        radii[i] = rn;
    }

    return { positions, colors, sizes, radii };
}
