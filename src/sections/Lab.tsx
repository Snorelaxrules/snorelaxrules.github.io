import { projects } from "../content/data";
import { SectionHeader } from "./SectionHeader";
import type { SectionProps } from "./types";

export default function Lab({ cluster }: SectionProps) {
    return (
        <>
            <SectionHeader kicker={cluster.subtitle} title={cluster.label}>
                <p>Things I'm building, have built, or am poking at.</p>
            </SectionHeader>
            <ul className="card-grid">
                {projects.map((p) => (
                    <li key={p.title} className="card">
                        <div className="card-meta">
                            <span className="pill">{p.status}</span>
                            <span className="muted">{p.year}</span>
                        </div>
                        <h2>{p.title}</h2>
                        <p>{p.description}</p>
                        {p.tags.length > 0 && (
                            <ul className="tags" aria-label="Tags">
                                {p.tags.map((t) => (
                                    <li key={t}>{t}</li>
                                ))}
                            </ul>
                        )}
                        {p.links.length > 0 && (
                            <div className="card-links">
                                {p.links.map((l) => (
                                    <a
                                        key={l.url}
                                        href={l.url}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        {l.label} ↗
                                    </a>
                                ))}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </>
    );
}
