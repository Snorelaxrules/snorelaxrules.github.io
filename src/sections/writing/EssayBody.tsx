import type { Element, ElementContent } from "hast";
import { type MouseEvent, type ReactNode, memo, useState } from "react";
import Markdown, { type Components } from "react-markdown";
import { Link } from "react-router";
import remarkGfm from "remark-gfm";
import { assetUrl } from "../../content/writing";
import { prefersReducedMotion } from "../../scene/pointer";
import { remarkPullQuote } from "./remarkPullQuote";

/** An essay image, lazy-loaded; a missing file shows a quiet note instead of a broken icon. */
export function EssayImage({
    src,
    alt,
    className,
    onFail,
}: {
    src: string;
    alt: string;
    className?: string;
    onFail?: () => void;
}) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) {
        return (
            <span
                className={`essay-img-missing ${className ?? ""}`}
                role="img"
                aria-label={alt || "Image unavailable"}
            >
                Image unavailable{alt ? `: ${alt}` : ""}
            </span>
        );
    }
    return (
        <img
            className={className}
            src={assetUrl(src)}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => {
                setFailed(true);
                onFail?.();
            }}
        />
    );
}

function Figure({
    src,
    alt,
    caption,
}: {
    src: string;
    alt: string;
    caption?: string;
}) {
    return (
        <figure className="essay-figure">
            <EssayImage src={src} alt={alt} />
            {caption && <figcaption>{caption}</figcaption>}
        </figure>
    );
}

const isBlank = (c: ElementContent) => c.type === "text" && !c.value.trim();
const prop = (el: Element, key: string) => {
    const v = el.properties?.[key];
    return typeof v === "string" ? v : "";
};

/** In-page anchors (footnotes): scroll inside the page instead of changing the router's hash. */
function jumpTo(e: MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "center",
    });
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
}

const components: Components = {
    // the essay title is the page's h1; a "#" heading in the body becomes an h2
    h1: ({ node: _node, ...props }) => <h2 {...props} />,

    // a paragraph holding only images is a figure (a caption comes from the image title)
    p: ({ node, children, ...props }) => {
        const kids = node?.children.filter((c) => !isBlank(c)) ?? [];
        if (
            kids.length > 0 &&
            kids.every((c) => c.type === "element" && c.tagName === "img")
        ) {
            return (
                <>
                    {(kids as Element[]).map((img, i) => (
                        <Figure
                            key={i}
                            src={prop(img, "src")}
                            alt={prop(img, "alt")}
                            caption={prop(img, "title") || undefined}
                        />
                    ))}
                </>
            );
        }
        return <p {...props}>{children}</p>;
    },

    // an image inside running text stays inline
    img: ({ src, alt }) => (
        <EssayImage
            src={typeof src === "string" ? src : ""}
            alt={alt ?? ""}
            className="essay-img-inline"
        />
    ),

    a: ({ node: _node, href = "", children, ...props }) => {
        if (href.startsWith("#")) {
            return (
                <a
                    {...props}
                    href={href}
                    onClick={(e) =>
                        jumpTo(e, decodeURIComponent(href.slice(1)))
                    }
                >
                    {children}
                </a>
            );
        }
        // another page of this site: through the router (the site uses hash URLs)
        if (href.startsWith("/") && !/\.[a-z0-9]+$/i.test(href)) {
            return (
                <Link {...props} to={href}>
                    {children}
                </Link>
            );
        }
        const external = /^https?:/.test(href);
        return (
            <a
                {...props}
                href={
                    external || href.startsWith("mailto:")
                        ? href
                        : assetUrl(href)
                }
                {...(external && { target: "_blank", rel: "noreferrer" })}
            >
                {children}
                {external && (
                    <span className="sr-only"> (opens in a new tab)</span>
                )}
            </a>
        );
    },

    // wide tables scroll sideways instead of widening the column
    table: ({ node: _node, ...props }) => (
        <div className="essay-table">
            <table {...props} />
        </div>
    ),
};

const remarkPlugins = [remarkGfm, remarkPullQuote];

/** Markdown → real HTML (GFM: tables, footnotes, strikethrough, task lists). */
export const EssayBody = memo(function EssayBody({
    markdown,
}: {
    markdown: string;
}): ReactNode {
    return (
        <Markdown remarkPlugins={remarkPlugins} components={components}>
            {markdown}
        </Markdown>
    );
});
