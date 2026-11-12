import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { Link } from "react-router";
import { clusterById, clusters } from "../content/clusters";
import { site } from "../content/site";
import { exitCourse, useCourse } from "../scene/course/courseState";
import { goTo, useGalaxy } from "../state/galaxyStore";

/**
 * Galaxy HUD: brand and destination nav up top; the fly-to prompt and control
 * hints at the bottom. In the anomaly course the nav steps aside for the
 * course HUD, and a return button plus a controls card appear.
 */
export function HomeHud({ visible }: { visible: boolean }) {
    const hovered = useGalaxy((s) => s.hovered);
    const setHovered = useGalaxy((s) => s.setHovered);
    const proximity = useGalaxy((s) => s.proximity);
    const hintVisible = useGalaxy((s) => s.hintVisible);
    const target = clusterById(proximity);
    const inCourse = useCourse((s) => s.inCourse);

    // pointer cursor while a cluster in the scene is hovered
    useEffect(() => {
        // galaxy view: grab cursor signals the background can be dragged
        document.body.style.cursor = !visible
            ? ""
            : hovered
              ? "pointer"
              : "grab";
        return () => {
            document.body.style.cursor = "";
        };
    }, [hovered, visible]);

    return (
        <motion.div
            className="home-hud"
            initial={{ opacity: 0 }}
            animate={{
                opacity: visible ? 1 : 0,
                transition: {
                    duration: visible ? 0.8 : 0.3,
                    delay: visible ? 0.3 : 0,
                },
            }}
            style={{ pointerEvents: "none" }}
            aria-hidden={!visible}
        >
            <Link to="/" className="brand" tabIndex={visible ? 0 : -1}>
                {site.name}
            </Link>

            {/* destinations, top center (hidden in the course, where its HUD takes the spot) */}
            <nav
                className={`dest-nav${inCourse ? " is-away" : ""}`}
                aria-label="Destinations"
                aria-hidden={inCourse || undefined}
            >
                <ul>
                    {clusters.map((c) => (
                        <li key={c.id}>
                            <button
                                type="button"
                                tabIndex={visible && !inCourse ? 0 : -1}
                                className={
                                    hovered === c.id || proximity === c.id
                                        ? "is-active"
                                        : undefined
                                }
                                onPointerEnter={() => setHovered(c.id)}
                                onPointerLeave={() => setHovered(null)}
                                onFocus={() => setHovered(c.id)}
                                onBlur={() => setHovered(null)}
                                onClick={() => goTo(c.route)}
                            >
                                {c.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            <AnimatePresence>
                {inCourse && visible && (
                    <motion.button
                        key="course-exit"
                        type="button"
                        className="course-exit"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{
                            opacity: 1,
                            x: 0,
                            transition: { duration: 0.3 },
                        }}
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        onClick={(e) => {
                            exitCourse();
                            e.currentTarget.blur();
                        }}
                    >
                        <span aria-hidden="true">←</span> Return to galaxy{" "}
                        <kbd>Esc</kbd>
                    </motion.button>
                )}
            </AnimatePresence>

            <div className="hud-bottom">
                <div className="hud-prompt-slot" aria-live="polite">
                    <AnimatePresence>
                        {target && visible && !inCourse && (
                            <motion.p
                                key={target.id}
                                className="hud-prompt"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    transition: { duration: 0.25 },
                                }}
                                exit={{
                                    opacity: 0,
                                    transition: { duration: 0.15 },
                                }}
                            >
                                Press <kbd>Space</kbd> to enter{" "}
                                <strong>{target.label}</strong>
                            </motion.p>
                        )}
                    </AnimatePresence>
                </div>
                <motion.p
                    className="hud-hint"
                    animate={{
                        opacity: inCourse ? 0 : hintVisible && !target ? 1 : 0,
                    }}
                    transition={{ duration: hintVisible ? 0.6 : 1.2 }}
                    aria-hidden={!hintVisible || inCourse}
                >
                    <span className="keys">
                        <kbd>W</kbd>
                        <kbd>A</kbd>
                        <kbd>S</kbd>
                        <kbd>D</kbd>
                    </span>
                    to fly <span className="sep">·</span> <kbd>Space</kbd> to
                    enter <span className="sep">·</span> or click a cluster{" "}
                    <span className="sep">·</span> drag to look around
                </motion.p>
                <AnimatePresence>
                    {inCourse && visible && (
                        <motion.div
                            key="course-controls"
                            className="course-controls"
                            role="note"
                            aria-label="Course controls"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                transition: { duration: 0.35 },
                            }}
                            exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        >
                            <p className="course-controls-head">
                                <span className="course-controls-badge">
                                    Controls changed
                                </span>{" "}
                                Steer from the ship's nose, like a real ship
                            </p>
                            <div className="course-controls-keys">
                                <span className="course-key">
                                    <span className="keys">
                                        <kbd>A</kbd>
                                        <kbd>D</kbd>
                                    </span>
                                    rotate
                                </span>
                                <span className="course-key">
                                    <kbd>W</kbd> thrust forward
                                </span>
                                <span className="course-key">
                                    <kbd>S</kbd> brake
                                </span>
                            </div>
                            <p className="course-controls-more">
                                <kbd>R</kbd> respawn{" "}
                                <span className="sep">·</span> <kbd>T</kbd>{" "}
                                trajectory <span className="sep">·</span>{" "}
                                <kbd>Esc</kbd> back to normal flight
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
