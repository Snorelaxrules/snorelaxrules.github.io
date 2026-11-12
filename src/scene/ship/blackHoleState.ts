import { clusters } from "../../content/clusters";
import { SHIP, rangeOf } from "./shipConfig";

/**
 * Where the black hole sits this visit: random, but clear of every cluster's
 * entry range and of the ship's spawn point. Screen-plane (x/y) coordinates.
 * `?bh=x,y` pins it (handy for tuning the physics).
 */
export const blackHole = (() => {
    const B = SHIP.blackHole;
    const pinned = new URLSearchParams(window.location.search)
        .get("bh")
        ?.split(",")
        .map(Number);
    if (pinned?.length === 2 && pinned.every(Number.isFinite))
        return { x: pinned[0], y: pinned[1], active: true };

    const ok = (x: number, y: number) =>
        Math.hypot(x - SHIP.spawn.x, y - SHIP.spawn.y) >= B.spawnClearance &&
        clusters.every(
            (c) =>
                Math.hypot(x - c.position[0], y - c.position[1]) >=
                rangeOf(c) + B.clusterClearance,
        );

    for (let i = 0; i < 400; i++) {
        const x = (Math.random() * 2 - 1) * (SHIP.bounds.x - 8);
        const y =
            SHIP.bounds.yMin +
            8 +
            Math.random() * (SHIP.bounds.yMax - SHIP.bounds.yMin - 14);
        if (ok(x, y)) return { x, y, active: true };
    }
    // no room (e.g. someone added lots of clusters): no black hole this time
    return { x: 0, y: 0, active: false };
})();
