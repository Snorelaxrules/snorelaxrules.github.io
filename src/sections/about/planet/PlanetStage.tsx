import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
    type MutableRefObject,
    type RefObject,
    useEffect,
    useMemo,
    useRef,
} from "react";
import {
    AdditiveBlending,
    BackSide,
    BufferGeometry,
    Color,
    type Group,
    type Mesh,
    ShaderMaterial,
    Vector3,
} from "three";
import {
    type Moon,
    type PlanetLook,
    planetScan,
} from "../../../content/aboutContent";
import { damp, prefersReducedMotion } from "../../../scene/pointer";
import { MoonIcon } from "./MoonIcon";
import {
    atmosphereFragment,
    cloudFragment,
    sphereVertex,
    surfaceFragment,
} from "./shaders";

const DEG = Math.PI / 180;
/** sun direction (world space): upper-left-front, so the terminator falls on the right */
const LIGHT = new Vector3(-0.75, 0.35, 0.55).normalize();
/** the whole system is viewed from slightly above */
const SYSTEM_TILT = 0.32;
const OBLIQUITY = 0.38;

/** Drag state shared between the DOM pointer handlers and the render loop. */
export interface SpinControl {
    dragging: boolean;
    /** radians/second; decays back toward the idle spin when released */
    yawVel: number;
    pitch: number;
}

function usePlanetMaterials(look: PlanetLook) {
    return useMemo(() => {
        const c = look.colors;
        const col = (hex: string) => ({ value: new Color(hex) });
        const surface = new ShaderMaterial({
            vertexShader: sphereVertex,
            fragmentShader: surfaceFragment,
            uniforms: {
                uLight: { value: LIGHT },
                uSeed: { value: look.seed },
                uSea: { value: look.seaLevel },
                uDeep: col(c.deepOcean),
                uOcean: col(c.ocean),
                uShallows: col(c.shallows),
                uLand: col(c.land),
                uHigh: col(c.highlands),
                uIce: col(c.ice),
                uAtmo: col(c.atmosphere),
                uCity: col(c.cityLights),
            },
        });
        const clouds = new ShaderMaterial({
            vertexShader: sphereVertex,
            fragmentShader: cloudFragment,
            uniforms: {
                uLight: { value: LIGHT },
                uColor: col(c.clouds),
                uSeed: { value: look.seed },
                uTime: { value: 0 },
            },
            transparent: true,
            depthWrite: false,
        });
        const atmosphere = new ShaderMaterial({
            vertexShader: sphereVertex,
            fragmentShader: atmosphereFragment,
            uniforms: { uLight: { value: LIGHT }, uColor: col(c.atmosphere) },
            transparent: true,
            depthWrite: false,
            side: BackSide,
            blending: AdditiveBlending,
        });
        return { surface, clouds, atmosphere };
    }, [look]);
}

function Planet({ spinRef }: { spinRef: RefObject<SpinControl> }) {
    const look = planetScan.planet;
    const bodyRef = useRef<Group>(null);
    const tiltRef = useRef<Group>(null);
    const cloudRef = useRef<Mesh<BufferGeometry, ShaderMaterial>>(null);
    const { surface, clouds, atmosphere } = usePlanetMaterials(look);

    useEffect(
        () => () => {
            surface.dispose();
            clouds.dispose();
            atmosphere.dispose();
        },
        [surface, clouds, atmosphere],
    );

    useFrame(({ clock }, delta) => {
        const body = bodyRef.current;
        const tilt = tiltRef.current;
        const s = spinRef.current;
        if (!body || !tilt || !s) return;
        const dt = Math.min(delta, 0.05);
        const idle = look.rotationSpeed * (prefersReducedMotion() ? 0.25 : 1);
        if (!s.dragging) {
            // inertia: drag velocity eases back to the idle spin; pitch eases level
            s.yawVel = damp(s.yawVel, idle, 1.6, dt);
            s.pitch = damp(s.pitch, 0, 1.2, dt);
        } else {
            // holding still while grabbed stops the spin
            s.yawVel = damp(s.yawVel, 0, 6, dt);
        }
        body.rotation.y += s.yawVel * dt;
        tilt.rotation.x = s.pitch;
        const cloud = cloudRef.current;
        if (cloud) {
            cloud.rotation.y += dt * 0.02;
            cloud.material.uniforms.uTime.value = clock.elapsedTime;
        }
    });

    return (
        <group ref={tiltRef}>
            <group rotation={[0, 0, OBLIQUITY]}>
                <group ref={bodyRef}>
                    <mesh material={surface}>
                        <sphereGeometry args={[1, 96, 64]} />
                    </mesh>
                    {look.clouds && (
                        <mesh ref={cloudRef} material={clouds} scale={1.015}>
                            <sphereGeometry args={[1, 64, 48]} />
                        </mesh>
                    )}
                </group>
            </group>
            <mesh material={atmosphere} scale={1.13}>
                <sphereGeometry args={[1, 64, 48]} />
            </mesh>
        </group>
    );
}

function OrbitLine({
    radius,
    highlighted,
}: {
    radius: number;
    highlighted: boolean;
}) {
    const geometry = useMemo(() => {
        const pts = Array.from({ length: 129 }, (_, i) => {
            const a = (i / 128) * Math.PI * 2;
            return new Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
        });
        return new BufferGeometry().setFromPoints(pts);
    }, [radius]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    return (
        <lineLoop geometry={geometry}>
            <lineBasicMaterial
                color="#7ae0ff"
                transparent
                opacity={highlighted ? 0.45 : 0.12}
                depthWrite={false}
            />
        </lineLoop>
    );
}

interface MoonProps {
    moon: Moon;
    index: number;
    active: boolean;
    selected: boolean;
    /** the moon's DOM button (rendered over the canvas by PlanetStage) */
    buttons: MutableRefObject<(HTMLButtonElement | null)[]>;
}

/**
 * One moon and its orbit. Its button is plain DOM over the canvas, placed here
 * every frame by projecting the moon to the screen (drei's <Html> left the
 * first moon's button empty).
 */
function MoonBody({ moon, index, active, selected, buttons }: MoonProps) {
    const ref = useRef<Group>(null);
    const angle = useRef(index * 2.1);
    const tmp = useMemo(
        () => ({
            world: new Vector3(),
            dir: new Vector3(),
            screen: new Vector3(),
        }),
        [],
    );
    const paused = active || selected;

    useFrame(({ camera, size }, delta) => {
        const g = ref.current;
        if (!g) return;
        if (!paused)
            angle.current +=
                moon.speed *
                Math.min(delta, 0.05) *
                (prefersReducedMotion() ? 0.3 : 1);
        g.position.set(
            Math.cos(angle.current) * moon.radius,
            0,
            Math.sin(angle.current) * moon.radius,
        );
        const btn = buttons.current[index];
        if (!btn) return;
        const w = g.getWorldPosition(tmp.world);
        // hide the button while the moon is behind the planet:
        // on the far side of it and within its silhouette (radius 1)
        const d = tmp.dir.copy(camera.position).normalize();
        const along = w.dot(d);
        const offAxis = Math.sqrt(Math.max(0, w.lengthSq() - along * along));
        const behind = along < 0 && offAxis < 1.05;
        btn.dataset.hidden = behind ? "true" : "false";
        btn.tabIndex = behind ? -1 : 0;
        const p = tmp.screen.copy(w).project(camera);
        const x = (p.x * 0.5 + 0.5) * size.width;
        const y = (-p.y * 0.5 + 0.5) * size.height;
        btn.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        // nearer moons stack above farther ones
        btn.style.zIndex = String(Math.round(10 + along * 3));
    });

    const highlight = active || selected;
    return (
        <group rotation={[moon.tilt * DEG, 0, 0]}>
            <OrbitLine radius={moon.radius} highlighted={highlight} />
            <group ref={ref}>
                <mesh scale={moon.size * (highlight ? 1.25 : 1)}>
                    <sphereGeometry args={[1, 24, 16]} />
                    <meshStandardMaterial
                        color={moon.color}
                        emissive={moon.color}
                        emissiveIntensity={highlight ? 0.7 : 0.18}
                        roughness={0.85}
                    />
                </mesh>
            </group>
        </group>
    );
}

function CameraSetup() {
    const camera = useThree((s) => s.camera);
    useEffect(() => {
        camera.lookAt(0, 0, 0);
    }, [camera]);
    return null;
}

export interface PlanetStageProps {
    spinRef: RefObject<SpinControl>;
    activeMoon: number | null;
    selectedMoon: number | null;
    onActiveMoon: (i: number | null) => void;
    onSelectMoon: (i: number) => void;
}

/** The planet's own small canvas, plus the moon buttons over it. Mounted only while the Planet Scan tab is open. */
export function PlanetStage({
    spinRef,
    activeMoon,
    selectedMoon,
    onActiveMoon,
    onSelectMoon,
}: PlanetStageProps) {
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);
    return (
        <>
            <Canvas
                flat
                dpr={[1, 1.5]}
                gl={{
                    antialias: true,
                    powerPreference: "high-performance",
                    alpha: true,
                }}
                camera={{ fov: 34, position: [0, 0, 7.4], near: 0.1, far: 50 }}
            >
                <CameraSetup />
                <ambientLight intensity={0.25} />
                <directionalLight
                    position={LIGHT.clone().multiplyScalar(10)}
                    intensity={2.2}
                />
                <group rotation={[SYSTEM_TILT, 0, 0]}>
                    <Planet spinRef={spinRef} />
                    {planetScan.moons.map((m, i) => (
                        <MoonBody
                            key={m.name}
                            moon={m}
                            index={i}
                            active={activeMoon === i}
                            selected={selectedMoon === i}
                            buttons={buttons}
                        />
                    ))}
                </group>
            </Canvas>
            <div className="moon-layer">
                {planetScan.moons.map((m, i) => {
                    const highlight = activeMoon === i || selectedMoon === i;
                    return (
                        <button
                            key={m.name}
                            ref={(el) => {
                                buttons.current[i] = el;
                            }}
                            type="button"
                            className={`moon-btn${highlight ? " is-active" : ""}`}
                            aria-label={`Moon ${m.name}: ${m.value}`}
                            aria-expanded={selectedMoon === i}
                            data-moon-control=""
                            onPointerEnter={() => onActiveMoon(i)}
                            onPointerLeave={() => onActiveMoon(null)}
                            onFocus={() => onActiveMoon(i)}
                            onBlur={() => onActiveMoon(null)}
                            onClick={() => onSelectMoon(i)}
                        >
                            {m.icon && (
                                <span className="moon-icon">
                                    <MoonIcon name={m.icon} />
                                </span>
                            )}
                            <span className="moon-label">{m.name}</span>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
