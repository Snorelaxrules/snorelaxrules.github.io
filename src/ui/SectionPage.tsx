import { motion } from "motion/react";
import { Suspense, createElement, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import type { ClusterConfig } from "../content/clusters";
import { WIDE_SECTIONS, sectionFor } from "../sections/registry";
import "../sections/sections.css";

/**
 * Full-screen page shown after the camera dives into a cluster. The scene keeps
 * running behind it, dimmed and blurred.
 */
export function SectionPage({ cluster }: { cluster: ClusterConfig }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const scrollRef = useRef<HTMLDivElement>(null);
    const backRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        // move focus into the page without flashing a focus ring for pointer users
        backRef.current?.focus({
            preventScroll: true,
            focusVisible: false,
        } as FocusOptions);
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [pathname]);

    return (
        <motion.div
            ref={scrollRef}
            className="page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.6 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
            <div className="page-bar">
                <button
                    ref={backRef}
                    type="button"
                    className="page-back"
                    onClick={() => navigate("/")}
                >
                    <span className="page-back-arrow" aria-hidden="true">
                        ←
                    </span>{" "}
                    Back to galaxy
                </button>
            </div>
            <motion.main
                className={`page-main${WIDE_SECTIONS.has(cluster.id) ? " is-wide" : ""}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                        delay: 0.15,
                        duration: 0.7,
                        ease: [0.22, 1, 0.36, 1],
                    },
                }}
            >
                <Suspense fallback={<p className="muted">Charting course…</p>}>
                    {createElement(sectionFor(cluster.id), { cluster })}
                </Suspense>
            </motion.main>
        </motion.div>
    );
}
