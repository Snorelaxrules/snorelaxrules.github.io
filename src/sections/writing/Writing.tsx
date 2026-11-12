import "@fontsource-variable/literata/opsz.css";
import "@fontsource-variable/literata/opsz-italic.css";
import { Link, Navigate, useLocation } from "react-router";
import { essayBySlug, essays, formatDate } from "../../content/writing";
import { SectionHeader } from "../SectionHeader";
import type { SectionProps } from "../types";
import { EssayReader } from "./EssayReader";
import "./writing.css";

/** Writing: the essay list at /writing, one essay per /writing/<slug>. */
export default function Writing({ cluster }: SectionProps) {
    const { pathname } = useLocation();
    const prefix = `${cluster.route}/`;
    const slug = pathname.startsWith(prefix)
        ? decodeURIComponent(pathname.slice(prefix.length))
        : null;

    if (slug) {
        const essay = essayBySlug(slug);
        if (!essay) return <Navigate to={cluster.route} replace />;
        return (
            <EssayReader
                key={essay.slug}
                essay={essay}
                indexRoute={cluster.route}
            />
        );
    }

    return (
        <div className="essays">
            <SectionHeader kicker={cluster.subtitle} title={cluster.label}>
                <p>Essays, newest first.</p>
            </SectionHeader>
            {essays.length === 0 ? (
                <p className="muted">Nothing here yet.</p>
            ) : (
                <ol className="essay-list">
                    {essays.map((e) => (
                        <li key={e.slug}>
                            <Link
                                to={`${cluster.route}/${e.slug}`}
                                className="essay-item"
                            >
                                <p className="essay-item-meta">
                                    <time dateTime={e.date}>
                                        {formatDate(e.date)}
                                    </time>
                                    <span aria-hidden="true"> · </span>
                                    <span>{e.readMinutes} min read</span>
                                </p>
                                <h2>{e.title}</h2>
                                {e.summary && (
                                    <p className="essay-item-summary">
                                        {e.summary}
                                    </p>
                                )}
                            </Link>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
