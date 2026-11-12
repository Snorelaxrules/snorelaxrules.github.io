import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { clusterById, clusters } from "../../content/clusters";
import { goTo, useGalaxy } from "../../state/galaxyStore";
import { useIntro } from "../../state/introStore";
import { COURSE } from "../course/courseConfig";
import { inCourseZone, stepCourse } from "../course/coursePhysics";
import {
    course,
    courseView,
    enterCourse,
    resetRace,
    useCourse,
} from "../course/courseState";
import { flight } from "../flight";
import { damp, prefersReducedMotion } from "../pointer";
import { SHIP, rangeOf } from "./shipConfig";
import { BlackHole } from "./BlackHole";
import { blackHole } from "./blackHoleState";
import { ShipModel } from "./ShipModel";
import { ShipTrail } from "./ShipTrail";
import { type Direction, keys, pan, ship } from "./shipState";

const KEYMAP: Record<string, Direction> = {
    KeyW: "up",
    ArrowUp: "up",
    KeyS: "down",
    ArrowDown: "down",
    KeyA: "left",
    ArrowLeft: "left",
    KeyD: "right",
    ArrowRight: "right",
};

/** Shortest signed angle from a to b, radians. */
const angleDelta = (a: number, b: number) =>
    Math.atan2(Math.sin(b - a), Math.cos(b - a));

const isTyping = (t: EventTarget | null) =>
    t instanceof HTMLElement &&
    (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/** Keys only steer the ship on the galaxy view, never while a page is open or during the intro. */
const canFly = () =>
    useIntro.getState().phase === "arrived" &&
    useGalaxy.getState().activeId === null &&
    !useCourse.getState().secretOpen;

const SUBSTEP = 1 / 240;
const smoothstep = (e0: number, e1: number, x: number) => {
    const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return u * u * (3 - 2 * u);
};

/**
 * Thrust, black-hole gravity, drag, and soft bounds, integrated in fixed
 * sub-steps (semi-implicit Euler) so tight passes near the hole stay stable at
 * any frame rate. Returns the final speed.
 */
function integrate(dt: number, ix: number, iy: number, flying: boolean) {
    const { pos, vel } = ship;
    const BH = SHIP.blackHole;
    const b = SHIP.bounds;
    const eps2 = BH.softening * BH.softening;
    const steps = Math.max(1, Math.ceil(dt / SUBSTEP));
    const h = dt / steps;
    let speed = Math.hypot(vel.x, vel.y);

    for (let i = 0; i < steps; i++) {
        // thrust only adds speed up to maxSpeed in the direction you're pushing,
        // so gravity can take you faster than the engines can
        if (ix || iy) {
            const along = vel.x * ix + vel.y * iy;
            if (along < SHIP.maxSpeed) {
                vel.x += ix * SHIP.accel * h;
                vel.y += iy * SHIP.accel * h;
            }
        }

        // gravity: a = mu * r / (r² + ε²)^1.5, faded out toward the edge of influence
        let well = 0;
        if (flying && blackHole.active) {
            const dx = blackHole.x - pos.x;
            const dy = blackHole.y - pos.y;
            const r2 = dx * dx + dy * dy;
            const r = Math.sqrt(r2);
            if (r < BH.horizon) {
                swallow();
                return 0;
            }
            const fade = 1 - smoothstep(BH.influence * 0.6, BH.influence, r);
            if (fade > 0) {
                const a = (BH.mu / (r2 + eps2) ** 1.5) * fade;
                vel.x += dx * a * h;
                vel.y += dy * a * h;
            }
            well = 1 - smoothstep(BH.softening * 2, BH.influence * 0.7, r);
        }

        // drag, weaker deep in the well so slingshots carry their speed
        const decay = Math.exp(-SHIP.drag * (1 + (BH.wellDrag - 1) * well) * h);
        vel.x *= decay;
        vel.y *= decay;

        // above cruising speed, the excess bleeds off once you're clear of the well
        speed = Math.hypot(vel.x, vel.y);
        if (speed > SHIP.maxSpeed) {
            let target =
                SHIP.maxSpeed +
                (speed - SHIP.maxSpeed) *
                    Math.exp(-BH.overspeedBleed * (1 - well) * h);
            target = Math.min(target, BH.speedLimit);
            vel.x *= target / speed;
            vel.y *= target / speed;
            speed = target;
        }

        // soft world bounds (the right side opens onto the anomaly course)
        const k = SHIP.boundaryStiffness * h;
        if (pos.x > COURSE.zone.x1) vel.x -= (pos.x - COURSE.zone.x1) * k;
        if (pos.x < -b.x) vel.x -= (pos.x + b.x) * k;
        if (pos.y > b.yMax) vel.y -= (pos.y - b.yMax) * k;
        if (pos.y < b.yMin) vel.y -= (pos.y - b.yMin) * k;

        pos.x += vel.x * h;
        pos.y += vel.y * h;
    }
    return speed;
}

function swallow() {
    const len = Math.hypot(ship.vel.x, ship.vel.y);
    const a = Math.random() * Math.PI * 2;
    ship.entryX = len > 1e-3 ? ship.vel.x / len : Math.cos(a);
    ship.entryY = len > 1e-3 ? ship.vel.y / len : Math.sin(a);
    ship.swallowed = 0;
    ship.spin = 0;
    ship.vel.set(0, 0, 0);
}

function eject() {
    const BH = SHIP.blackHole;
    ship.pos.x = blackHole.x + ship.entryX * BH.ejectDistance;
    ship.pos.y = blackHole.y + ship.entryY * BH.ejectDistance;
    ship.vel.set(ship.entryX * BH.ejectSpeed, ship.entryY * BH.ejectSpeed, 0);
    ship.heading = Math.atan2(ship.entryY, ship.entryX);
    ship.swallowed = -1;
    ship.spin = 0;
}

/**
 * The player ship: keyboard input, framerate-independent physics, banking,
 * proximity targeting, and controls-hint timing. Visuals live in ShipModel
 * (swappable) and ShipTrail.
 */
export function Ship() {
    const bodyRef = useRef<Group>(null);
    const bankRef = useRef<Group>(null);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (
                e.metaKey ||
                e.ctrlKey ||
                e.altKey ||
                isTyping(e.target) ||
                !canFly()
            )
                return;
            const dir = KEYMAP[e.code];
            if (dir) {
                e.preventDefault();
                keys.add(dir);
                // a focused HUD button would otherwise swallow Space
                if (
                    document.activeElement instanceof HTMLElement &&
                    document.activeElement !== document.body
                ) {
                    document.activeElement.blur();
                }
                return;
            }
            if (e.code === "Space") {
                const target = clusterById(useGalaxy.getState().proximity);
                if (!target) return;
                e.preventDefault();
                if (!e.repeat) goTo(target.route);
            }
        };
        const onKeyUp = (e: KeyboardEvent) => {
            const dir = KEYMAP[e.code];
            if (dir) keys.delete(dir);
        };
        const clear = () => keys.clear();
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        window.addEventListener("blur", clear);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);
            window.removeEventListener("blur", clear);
            keys.clear();
        };
    }, []);

    useFrame(({ clock }, delta) => {
        const body = bodyRef.current;
        const bank = bankRef.current;
        if (!body || !bank) return;
        const dt = Math.min(delta, 0.05);
        const reduced = prefersReducedMotion();
        const flying = canFly();
        const swallowed = ship.swallowed >= 0;
        const galaxy = useGalaxy.getState();

        // --- input ---------------------------------------------------------------
        let ix = 0;
        let iy = 0;
        if (flying && !swallowed) {
            if (keys.has("left")) ix -= 1;
            if (keys.has("right")) ix += 1;
            if (keys.has("up")) iy += 1;
            if (keys.has("down")) iy -= 1;
        } else if (keys.size) {
            keys.clear();
        }
        // in the course, controls are ship-relative: A/D turn, W/S thrust along the nose
        const turn = -ix;
        const fwd = iy;
        let thrusting = ix !== 0 || iy !== 0;
        if (thrusting) {
            const len = Math.hypot(ix, iy);
            ix /= len;
            iy /= len;
        }

        // --- physics -------------------------------------------------------------
        const { pos, vel } = ship;
        let speed = 0;
        // the anomaly course: its own physics while flying inside the zone
        const inZone = flying && !swallowed && inCourseZone(pos.x);
        if (inZone !== course.inZone) {
            course.inZone = inZone;
            if (inZone) enterCourse();
            else resetRace();
            useCourse.getState().set({ inCourse: inZone });
        }
        courseView.k = damp(
            courseView.k,
            inZone ? 1 : 0,
            reduced ? 6 : COURSE.camera.blendRate,
            dt,
        );
        let courseTurn = 0;
        if (inZone) {
            const steer =
                course.status === "idle" ||
                course.status === "racing" ||
                course.status === "countdown";
            if (steer && turn) {
                courseTurn = turn * COURSE.physics.turnRate;
                ship.heading += courseTurn * dt;
            }
            const live = steer && course.status !== "countdown";
            const engine = live && fwd > 0;
            thrusting = engine;
            speed = stepCourse(dt, engine, live && fwd < 0, reduced);
        } else if (inCourseZone(pos.x) && !flying) {
            // a page is open while parked in the course: hold still
        } else if (swallowed) {
            // inside: drawn to the singularity, spinning, then spat out along the way we came in
            const BH = SHIP.blackHole;
            ship.swallowed += dt;
            const k = 1 - Math.exp(-10 * dt);
            pos.x += (blackHole.x - pos.x) * k;
            pos.y += (blackHole.y - pos.y) * k;
            ship.spin +=
                dt * (6 + 24 * Math.min(1, ship.swallowed / BH.swallowTime));
            if (ship.swallowed >= BH.swallowTime) eject();
        } else {
            speed = integrate(dt, ix, iy, flying);
        }
        pos.z =
            SHIP.spawn.z +
            (reduced ? 0 : Math.sin(clock.elapsedTime * 1.3) * 0.25);

        // nose follows the direction of travel; bank into turns
        let turnRate = courseTurn;
        if (inZone) {
            // the nose is player-controlled here; it doesn't follow the velocity
        } else if (speed > 1.5) {
            const step =
                angleDelta(ship.heading, Math.atan2(vel.y, vel.x)) *
                (1 - Math.exp(-SHIP.turnRate * dt));
            ship.heading += step;
            turnRate = step / dt;
        }
        const bankTarget = Math.max(
            -SHIP.maxBank,
            Math.min(SHIP.maxBank, -turnRate * SHIP.bankAmount),
        );
        ship.bank = damp(
            ship.bank,
            reduced ? bankTarget * 0.4 : bankTarget,
            6,
            dt,
        );
        ship.throttle = damp(ship.throttle, thrusting ? 1 : 0, 5, dt);

        // flying again brings a dragged view back onto the ship
        if (thrusting && !pan.dragging) {
            pan.x = damp(pan.x, 0, SHIP.camera.pan.recenterRate, dt);
            pan.y = damp(pan.y, 0, SHIP.camera.pan.recenterRate, dt);
        }

        body.position.copy(pos);
        body.rotation.set(0, 0, ship.heading + ship.spin);
        bank.rotation.x = ship.bank;
        const reveal = Math.min(1, flight.reveal);
        body.visible = reveal > 0.02;
        const squeeze = swallowed
            ? Math.max(
                  0,
                  1 - ship.swallowed / (SHIP.blackHole.swallowTime * 0.6),
              )
            : 1;
        const s = SHIP.scale * reveal * squeeze * ship.fxScale;
        // stretch along the nose (local x), thin across it: spaghettification
        body.scale.set(
            s * (1 + ship.stretch * 2.5),
            s * (1 - ship.stretch * 0.7),
            s * (1 - ship.stretch * 0.7),
        );
        body.visible = body.visible && ship.fxScale > 0.01;

        // --- proximity: nearest cluster in range (screen-plane distance) ----------
        let nearest: string | null = null;
        if (flying && !swallowed) {
            let best = Infinity;
            for (const c of clusters) {
                const d = Math.hypot(
                    c.position[0] - pos.x,
                    c.position[1] - pos.y,
                );
                if (d < rangeOf(c) && d < best) {
                    best = d;
                    nearest = c.id;
                }
            }
        }
        galaxy.setProximity(nearest);

        // --- controls hint: hide after a while of flying, return when idle --------
        if (flying) {
            if (thrusting) {
                ship.flying += dt;
                ship.idle = 0;
            } else {
                ship.idle += dt;
            }
            if (galaxy.hintVisible && ship.flying > SHIP.hint.hideAfterFlying)
                galaxy.setHintVisible(false);
            if (!galaxy.hintVisible && ship.idle > SHIP.hint.showAfterIdle) {
                ship.flying = 0;
                galaxy.setHintVisible(true);
            }
        }
    });

    return (
        <>
            <ambientLight intensity={0.6} />
            <directionalLight position={[-30, 40, 60]} intensity={2.2} />
            <group ref={bodyRef}>
                <group ref={bankRef}>
                    <ShipModel />
                </group>
            </group>
            <ShipTrail />
            {blackHole.active && (
                <BlackHole
                    x={blackHole.x}
                    y={blackHole.y}
                    shadowRadius={SHIP.blackHole.shadowRadius}
                    diskRadius={SHIP.blackHole.diskRadius}
                />
            )}
        </>
    );
}
