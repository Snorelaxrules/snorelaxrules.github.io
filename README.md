# snorelaxrules.github.io

Personal site of Talus Leong. Visitors start in a spaceship cockpit, jump to
hyperspace, and arrive at a galaxy map. Each section is a procedurally
generated star cluster you can fly into.

Vite · React · TypeScript · React Three Fiber · Motion · d3-geo. Hosted on GitHub Pages.

## Running it

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
npm run lint
```

Every push to `main` builds and deploys via `.github/workflows/deploy.yml`.
The repo's Settings → Pages → Source must be set to **GitHub Actions**.

Useful URLs while developing:

- `/?intro` plays the intro even if it already played this session.
- `/?nowebgl` simulates a browser without WebGL (static fallback).
- `/#/writing`, `/#/map`, … deep-link straight into a section.

## Editing content

All text lives in `/content`. Edit it, commit, push. No component changes needed.

| File | What it controls |
| --- | --- |
| `content/site.json` | Name and tagline |
| `content/about.md` | Bio (markdown body) plus `role`, `location`, `photo`, `resume` frontmatter |
| `content/writing/*.md` | Blog posts |
| `content/places.json` | Places on the map |
| `content/projects.json` | Lab cards |
| `content/contact.json` | Email, intro text, social links |
| `content/clusters.json` | The galaxy map itself (see below) |

Static files (photo, résumé PDF, images used in posts) go in `/public` and are
referenced from the site root, e.g. `public/resume.pdf` → `/resume.pdf`.

### Add a post

Create `content/writing/my-post.md`:

```md
---
title: My post
date: 2026-11-04
summary: One line shown in the list.
---

Markdown body…
```

The filename becomes the URL: `/#/writing/my-post`. Posts sort newest-first by `date`.
Frontmatter supports simple `key: value` pairs and `key: [a, b]` lists.

### Add a place

Append to `content/places.json`:

```json
{ "name": "Kyoto, Japan", "lat": 35.0116, "lng": 135.7681, "date": "Apr 2025", "note": "Temples at dawn." }
```

### Add a cluster (a new section)

1. Append an entry to `content/clusters.json`:

   ```json
   {
     "id": "photos",
     "label": "Photos",
     "subtitle": "Light from far away",
     "route": "/photos",
     "kind": "spiral",
     "position": [0, 30, -40],
     "size": 9,
     "color": "#c9a6ff",
     "tilt": [50, 10],
     "spin": 2
   }
   ```

   - `kind` is `spiral`, `elliptical`, `globular`, or `beacon`.
   - `position` is in scene units. About sits at the origin and the home camera looks at it from `+z`. Roughly ±50 on x and ±20 on y stays in view.
   - Optional fields: `coreColor`, `arms` (spirals), `tilt` `[x, z]` in degrees, `spin` in deg/s, `particles` (count).

   That alone gives you the cluster, its hover label, the nav entry, the
   fly-in, and a "Coming soon" page.

2. For real content, create a component in `src/sections/` (it receives
   `{ cluster }`) and register it in `src/sections/registry.ts`. Add the id to
   `WIDE_SECTIONS` if it needs the wide layout.

## Customising the look

- **Jump timing and feel:** `src/intro/timeline.ts`. One timeline drives both the WebGL scene and the DOM overlays.
- **Camera (home view, flight times, drift, parallax):** `src/scene/rig.ts`.
- **Colours and fonts:** `src/styles/tokens.css`.
- **The ship:** `src/scene/ship/shipConfig.ts` holds speed, acceleration, drag, banking, bounds, proximity radius, camera follow and lag, trail, and hint timing. The look is in `ShipModel.tsx`; replace its contents to use a model or sprite, keeping the nose along +x and the engine at `ENGINE_OFFSET`.
- **Cockpit art:** `src/intro/cockpit.config.ts`. Set `frameImage` to a 16:9 PNG with transparent windows to replace the SVG frame. The instruments and lever share the same 1600×900 coordinate space, so they stay aligned.

## How it fits together

- `src/scene/`: one persistent R3F `<Canvas>` for the whole visit (sky, nebula, warp streaks, galaxies). It never remounts, so the jump flows straight into the galaxy map.
- `src/intro/`: the cockpit (SVG/DOM layered over the canvas), the lever, and the overlays (flash, vignette).
- `src/state/`: small zustand stores. The intro phase and the hovered, active, and docked cluster are read inside `useFrame` without re-rendering.
- Routing: `HashRouter`, so refreshes work on GitHub Pages. The route decides the active cluster. The camera rig flies there and the page opens once it has "docked".
- Section pages are plain HTML over a dimmed, blurred scene.

## Accessibility and performance

- **Reduced motion** (`prefers-reduced-motion`): the jump becomes a crossfade. There is no camera drift, parallax, flights, shake, twinkle, cluster spin, or globe spin, and Motion transitions drop to opacity only.
- **Keyboard:** the lever is focusable (Enter or Space). On the galaxy, WASD or the arrow keys fly the ship and Space enters the nearest cluster in range. The destination bar mirrors every cluster, and Esc skips the intro or closes a page. Flight keys are ignored while a page is open or while typing in a field.
- **Adaptive resolution:** the canvas steps its pixel ratio down on slow GPUs and drops to 1× while a page covers the scene.
- **WebGL fallback:** if WebGL is unavailable or the scene crashes, the site shows a static starfield and stays fully navigable.
- **Bundles:** vendor chunks (three, r3f, react, motion) are split for caching. The Map section (d3 + world outline) is lazy-loaded.
