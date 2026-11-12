import { Vector3 } from "three";
import type { ClusterConfig } from "../../content/clusters";

/**
 * Ship feel. Units are scene units (About's radius is 18) and seconds.
 * The ship flies in the screen plane (x/y) at a fixed depth in front of the clusters.
 */
export const SHIP = {
    /** where the ship waits on arrival: just below About, outside its range */
    spawn: new Vector3(0, -25, 18),
    scale: 1.4,

    /** thrust acceleration, units/s² */
    accel: 70,
    /** top speed, units/s */
    maxSpeed: 30,
    /** velocity decay rate per second (exponential). Higher = stops sooner when you let go */
    drag: 1.8,
    /** how quickly the nose swings to face the direction of travel */
    turnRate: 7,
    /** bank (roll) per rad/s of turning, and the cap, in radians */
    bankAmount: 0.14,
    maxBank: 0.6,

    /** soft world bounds: past these the ship is pushed back by a spring */
    bounds: { x: 64, yMin: -31, yMax: 26 },
    boundaryStiffness: 6,

    /** in-range radius around a cluster = base + cluster.size * perSize (screen-plane distance) */
    proximity: { base: 4, perSize: 0.9 },
    /** on leaving a section, the ship reappears this far outside that cluster's range */
    returnGap: 3,

    camera: {
        /** 0 = camera ignores the ship, 1 = keeps it pinned on screen */
        follow: 0.8,
        /** follow smoothing (higher = tighter); reduced motion uses the snappier value */
        lag: 2.2,
        lagReduced: 9,
        /** click-and-drag on empty space pans the view */
        pan: {
            /** how fast the view eases back onto the ship once you fly again */
            recenterRate: 2.5,
            /** how far the view center may go from About (scene units) */
            maxX: 56,
            minY: -26,
            maxY: 22,
        },
    },

    trail: {
        maxParticles: 220,
        /** particles/s while coasting and at full thrust */
        rateIdle: 6,
        rateThrust: 110,
        /** seconds */
        life: 0.9,
        /** emission and lifetime multiplier under reduced motion */
        reducedScale: 0.3,
    },

    /**
     * The black hole. Gravity is Plummer-softened Newtonian:
     *   a = mu * r / (r² + softening²)^1.5   (toward the center)
     * so it's strong but finite near the core, and it fades to zero by `influence`.
     * With these numbers the pull beats full thrust inside ~5 units.
     */
    blackHole: {
        mu: 2400,
        softening: 2.2,
        influence: 18,
        /** cross this radius and the ship is swallowed */
        horizon: 1.4,
        /** drag multiplier deep in the well (low = slingshots keep their speed) */
        wellDrag: 0.2,
        /** how quickly speed above maxSpeed bleeds off once you're out of the well (per second) */
        overspeedBleed: 1.2,
        /** absolute speed cap so a slingshot can't fling the ship off the map */
        speedLimit: 95,
        /** seconds inside before being spat out the other side */
        swallowTime: 1.1,
        ejectSpeed: 42,
        ejectDistance: 9,
        /** visual size: shadow (event horizon look) and accretion disk radius */
        shadowRadius: 2.1,
        diskRadius: 7.5,
        /** placement: stay this far outside every cluster's range, and away from the spawn */
        clusterClearance: 6,
        spawnClearance: 24,
    },

    hint: {
        /** hide the controls hint after this many seconds of flying */
        hideAfterFlying: 10,
        /** bring it back after this many seconds without input */
        showAfterIdle: 6,
    },
};

/** in-range radius around a cluster */
export const rangeOf = (c: ClusterConfig) =>
    SHIP.proximity.base + c.size * SHIP.proximity.perSize;
