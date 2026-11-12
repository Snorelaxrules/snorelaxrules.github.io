import { dossier } from "../../content/aboutContent";
import { contact } from "../../content/data";
import { Photo } from "./Photo";

/** Deterministic fake barcode from a string. */
function Barcode({ value }: { value: string }) {
    let h = 2166136261;
    const bars: { x: number; w: number }[] = [];
    let x = 0;
    for (let i = 0; i < 44; i++) {
        h = Math.imul(h ^ value.charCodeAt(i % value.length), 16777619) >>> 0;
        const w = 1 + (h % 3);
        if (i % 2 === 0) bars.push({ x, w });
        x += w;
    }
    return (
        <svg
            className="barcode"
            viewBox={`0 0 ${x} 20`}
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            {bars.map((b) => (
                <rect key={b.x} x={b.x} y="0" width={b.w} height="20" />
            ))}
        </svg>
    );
}

export function Dossier() {
    const d = dossier;
    return (
        <article className="dossier" aria-label={`Crew file: ${d.name}`}>
            <header className="dossier-head">
                <span>Crew file</span>
                <span className="dossier-id">{d.fileId}</span>
                <span className="clearance">Clearance · {d.clearance}</span>
            </header>
            <div className="dossier-body">
                <div className="dossier-ident">
                    <div className="dossier-photo">
                        <Photo
                            key={d.photo}
                            src={d.photo}
                            alt={`Portrait of ${d.name}`}
                            seed={d.name}
                        />
                    </div>
                    <Barcode value={d.fileId + d.name} />
                    <p className="dossier-code">{d.fileId}</p>
                </div>
                <div className="dossier-main">
                    <h2 className="dossier-name">{d.name}</h2>
                    <dl className="dossier-fields">
                        {d.fields.map((f) => (
                            <div key={f.label}>
                                <dt>{f.label}</dt>
                                <dd>{f.value}</dd>
                            </div>
                        ))}
                    </dl>
                    <dl className="dossier-now">
                        <div>
                            <dt>Reading</dt>
                            <dd>{d.now.reading}</dd>
                        </div>
                        <div>
                            <dt>Playing</dt>
                            <dd>{d.now.playing}</dd>
                        </div>
                        <div>
                            <dt>Listening</dt>
                            <dd>{d.now.listening}</dd>
                        </div>
                    </dl>
                    {d.redacted.length > 0 && (
                        <div className="dossier-redacted">
                            <p className="dossier-label">
                                Classified · hover to declassify
                            </p>
                            <ul>
                                {d.redacted.map((line) => (
                                    <li key={line}>
                                        <span className="redacted" tabIndex={0}>
                                            {line}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <blockquote className="dossier-motto">
                        “{d.motto}”
                    </blockquote>
                    <div className="dossier-actions">
                        {d.resume && (
                            <a
                                className="button"
                                href={d.resume}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Résumé
                            </a>
                        )}
                        <a
                            className="button button-ghost"
                            href={`mailto:${contact.email}`}
                        >
                            Email
                        </a>
                    </div>
                </div>
            </div>
        </article>
    );
}
