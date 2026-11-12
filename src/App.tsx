import { AnimatePresence } from "motion/react";
import { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { clusterForPath } from "./content/clusters";
import { IntroLayer } from "./intro/IntroLayer";
import { SpaceCanvas } from "./scene/SpaceCanvas";
import { useGalaxy } from "./state/galaxyStore";
import { useIntro } from "./state/introStore";
import { useCourse } from "./scene/course/courseState";
import { CourseHud } from "./ui/CourseHud";
import { HomeHud } from "./ui/HomeHud";
import { SceneBoundary } from "./ui/SceneBoundary";
import { SecretPage } from "./ui/SecretPage";
import { SectionPage } from "./ui/SectionPage";
import "./ui/ui.css";

export default function App() {
    const { pathname } = useLocation();
    const phase = useIntro((s) => s.phase);
    const active = clusterForPath(pathname);
    const docked = useGalaxy((s) => s.docked);
    const setActive = useGalaxy((s) => s.setActive);
    const sceneAvailable = useGalaxy((s) => s.sceneAvailable);
    const secretOpen = useCourse((s) => s.secretOpen);

    useEffect(() => {
        setActive(active?.id ?? null);
    }, [active, setActive]);

    // opening a section (e.g. editing the URL) while the cockpit is up skips the intro
    const skipIntro = useIntro((s) => s.skip);
    useEffect(() => {
        if (active && phase === "cockpit") skipIntro();
    }, [active, phase, skipIntro]);

    // Esc leaves a section from the moment it's chosen, including mid-flight
    const navigate = useNavigate();
    const inSection = active !== null;
    useEffect(() => {
        if (!inSection) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") navigate("/");
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [inSection, navigate]);

    if (!active && pathname !== "/") return <Navigate to="/" replace />;

    return (
        <>
            {sceneAvailable ? (
                <SceneBoundary>
                    <SpaceCanvas />
                </SceneBoundary>
            ) : (
                <div className="space-fallback" aria-hidden="true" />
            )}
            {phase !== "arrived" && <IntroLayer />}
            {phase === "arrived" && (
                <HomeHud visible={!active && !secretOpen} />
            )}
            {phase === "arrived" && sceneAvailable && <CourseHud />}
            <AnimatePresence>
                {active && docked === active.id && (
                    <SectionPage key={active.id} cluster={active} />
                )}
                {secretOpen && !active && <SecretPage key="secret" />}
            </AnimatePresence>
        </>
    );
}
