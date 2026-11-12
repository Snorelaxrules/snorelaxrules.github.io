import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
    type LogEntry,
    logEntries,
    stardate,
} from "../../content/aboutContent";
import { formatDate } from "../../content/writing";
import { prefersReducedMotion } from "../../scene/pointer";

const CHARS_PER_SEC = 110;

/**
 * Types the rendered markdown out character by character, keeping its
 * structure: elements stay hidden until their first character arrives, and a
 * cursor follows the insertion point. Click (or reduced motion) shows it all.
 */
function Typewriter({ entry }: { entry: LogEntry }) {
    const ref = useRef<HTMLDivElement>(null);
    const [typing, setTyping] = useState(true);

    useEffect(() => {
        const root = ref.current;
        if (!root) return;
        const nodes: { node: Text; text: string }[] = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            if (node.data.length) nodes.push({ node, text: node.data });
        }
        const cursor = document.createElement("span");
        cursor.className = "tw-cursor";
        cursor.setAttribute("aria-hidden", "true");
        const elements = Array.from(root.querySelectorAll<HTMLElement>("*"));
        const loop = {
            raf: 0,
            node: 0,
            char: 0,
            budget: 0,
            last: performance.now(),
            done: false,
        };

        const finish = () => {
            if (loop.done) return;
            loop.done = true;
            cancelAnimationFrame(loop.raf);
            for (const { node, text } of nodes) node.data = text;
            for (const el of elements) el.style.visibility = "";
            const lastNode = nodes[nodes.length - 1]?.node;
            if (lastNode) lastNode.after(cursor);
            else root.append(cursor);
            setTyping(false);
        };

        if (prefersReducedMotion() || nodes.length === 0) {
            finish();
            return () => cursor.remove();
        }

        for (const el of elements) el.style.visibility = "hidden";
        for (const n of nodes) n.node.data = "";

        const reveal = (node: Node) => {
            for (
                let el = node.parentElement;
                el && el !== root;
                el = el.parentElement
            )
                el.style.visibility = "visible";
        };

        const tick = (now: number) => {
            loop.budget += ((now - loop.last) / 1000) * CHARS_PER_SEC;
            loop.last = now;
            while (loop.budget >= 1 && loop.node < nodes.length) {
                const { node, text } = nodes[loop.node];
                if (loop.char === 0) reveal(node);
                const take = Math.min(
                    Math.floor(loop.budget),
                    text.length - loop.char,
                );
                loop.char += take;
                loop.budget -= take;
                node.data = text.slice(0, loop.char);
                node.after(cursor);
                if (loop.char >= text.length) {
                    loop.node++;
                    loop.char = 0;
                }
            }
            if (loop.node >= nodes.length) finish();
            else loop.raf = requestAnimationFrame(tick);
        };
        loop.raf = requestAnimationFrame(tick);
        root.addEventListener("click", finish);

        return () => {
            cancelAnimationFrame(loop.raf);
            root.removeEventListener("click", finish);
            cursor.remove();
            // leave the DOM as React rendered it (StrictMode re-runs this effect)
            for (const { node, text } of nodes) node.data = text;
            for (const el of elements) el.style.visibility = "";
        };
    }, []);

    return (
        <div
            ref={ref}
            className="console-entry"
            aria-busy={typing}
            title={typing ? "Click to skip" : undefined}
            dangerouslySetInnerHTML={{ __html: entry.html }}
        />
    );
}

export function ShipsLog() {
    const [selected, setSelected] = useState(logEntries[0]?.slug ?? "");
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const entry = logEntries.find((e) => e.slug === selected);

    const onListKey = (e: KeyboardEvent) => {
        const i = logEntries.findIndex((x) => x.slug === selected);
        const delta = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
        if (!delta) return;
        e.preventDefault();
        const next = Math.max(0, Math.min(logEntries.length - 1, i + delta));
        setSelected(logEntries[next].slug);
        itemRefs.current[next]?.focus();
    };

    if (!entry) return <p className="muted">The log is empty.</p>;

    return (
        <div className="console">
            <div className="console-bar" aria-hidden="true">
                <span className="console-lights">
                    <i />
                    <i />
                    <i />
                </span>
                <span>ship's log — /var/log/flight</span>
                <span className="console-count">
                    {logEntries.length} entries
                </span>
            </div>
            <div className="console-body">
                <ul
                    className="console-list"
                    aria-label="Log entries"
                    onKeyDown={onListKey}
                >
                    {logEntries.map((e, i) => (
                        <li key={e.slug}>
                            <button
                                ref={(el) => {
                                    itemRefs.current[i] = el;
                                }}
                                type="button"
                                className={
                                    e.slug === selected
                                        ? "is-selected"
                                        : undefined
                                }
                                aria-current={e.slug === selected}
                                onClick={() => setSelected(e.slug)}
                            >
                                <span className="console-date">
                                    {e.date} <em>{stardate(e.date)}</em>
                                </span>
                                <span className="console-title">{e.title}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="console-view">
                    <p className="console-meta">
                        {formatDate(entry.date)} · {stardate(entry.date)}
                    </p>
                    <h2 className="console-heading">&gt; {entry.title}</h2>
                    <Typewriter key={entry.slug} entry={entry} />
                </div>
            </div>
        </div>
    );
}
