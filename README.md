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
npm test          # unit tests (Vitest): game rules, kicks, handling
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
| `content/about/planet.json` | About → Planet Scan: the planet's look, survey readout lines, moons |
| `content/about/timeline.json` | About → Flight Path waypoints |
| `content/about/interests.json` | About → Constellation: one interest per star |
| `content/about/log/*.md` | About → Ship's Log entries |
| `content/writing/*.md` | Blog posts |
| `content/places.json` | Places on the map |
| `content/projects.json` | Lab cards |
| `content/contact.json` | Email, intro text, social links |
| `content/clusters.json` | The galaxy map itself (see below) |
| `content/secret.json` | The "Secret transmission" shown after finishing the hidden course |

Static files (photo, résumé PDF, images used in posts) go in `/public` and are
referenced from the site root, e.g. `public/Talus_Leong_Resume.pdf` → `/Talus_Leong_Resume.pdf`.

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

### About page

The About page has four tabs, each with its own URL: `/#/about` (Planet Scan),
`/#/about/flight-path`, `/#/about/constellation`, `/#/about/log`.
Photos are optional everywhere. Use a path under `/public` (e.g.
`/images/flight/robotics.jpg`); an empty or missing photo shows a generated
placeholder.

**Planet Scan** (`content/about/planet.json`):

- `planet.seed` reshapes the continents (any number). `seaLevel` (0–1) sets how
  much is ocean. `rotationSpeed` is in radians per second. `clouds` turns the
  cloud layer on or off.
- `planet.colors` holds the hex colours for `deepOcean`, `ocean`, `shallows`,
  `land`, `highlands` (the warm accent), `ice`, `clouds`, `atmosphere` (the rim
  glow), and `cityLights` (the dots on the night side).
- `readout` is a list of sections (Identity, Studies, …), shown in order:

  ```json
  { "title": "Studies", "strip": ["Computer Science", "AI", "Business"], "rows": [
    { "label": "Major", "value": "Computer Science", "flavor": "primary crust" }
  ] }
  ```

  Each row is `{ label, value, flavor? }`. `label` is a plain field name, `value`
  is the fact (shown large), and `flavor` is an optional planet joke (shown small
  underneath; keep it to about 8 words). `title` and `strip` are optional; `strip`
  draws equal decorative segments, never proportions.
- `unexplored` lines become hover-to-reveal bars under "Classified". `motto` is
  `{ value, flavor? }`, and `resume` is the button link.
- `moons` can be added or removed freely:

  ```json
  { "name": "Watching", "value": "[a show]", "image": "", "icon": "film", "color": "#9db4ff", "size": 0.09, "radius": 1.65, "speed": 0.35, "tilt": -6 }
  ```

  `radius` is the orbit in planet radii (keep it between about 1.4 and 2.1 so it
  stays in frame). `speed` is in radians per second, `tilt` is the orbit's
  incline in degrees, `image` is optional, and `icon` is an optional glyph shown
  beside the moon: `book`, `game`, `spotify`, `music` or `film`.

The scan animation plays once per session. The old ID-card Dossier is still in
`src/sections/about/Dossier.tsx` with `content/about/dossier.json`; uncomment its
two lines in `About.tsx` to bring it back.

**Add a timeline waypoint:** append to `waypoints` in `content/about/timeline.json`.
Waypoints show in array order, and the tracker adapts to any count.

```json
{ "title": "First hackathon", "date": "Spring 2024", "photo": "/images/flight/hackathon.jpg", "text": "Two sentences about it." }
```

**Change an interest:** edit the entry for that star in `content/about/interests.json`.
The constellation is real, so there are exactly seven stars: `polaris` (the anchor,
drawn brightest), `yildun`, `epsilon`, `zeta`, `eta`, `pherkad`, and `kochab`.

```json
{ "star": "kochab", "title": "Photography", "text": "Why I love it.", "photo": "" }
```

**Add a log entry:** add a markdown file to `content/about/log/`. The list sorts
newest-first and shows a stardate (year plus day of year) beside each date.

```md
---
title: Engines online
date: 2026-11-04
---

Markdown body…
```

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
- **The ship:** `src/scene/ship/shipConfig.ts` holds speed, acceleration, drag, banking, bounds, proximity radius, camera follow and lag, trail, and drag-to-pan limits, and hint timing. The look is in `ShipModel.tsx`; replace its contents to use a model or sprite, keeping the nose along +x and the engine at `ENGINE_OFFSET`.
- **Hidden course:** see "The gravitational anomaly" below.
- **Black hole:** `SHIP.blackHole` in the same file holds the gravity strength (`mu`), softening, influence radius, event horizon, how long the ship stays swallowed, and how hard it's spat out. It lands somewhere random on each visit; add `?bh=x,y` to the URL to pin it while tuning (e.g. `/?bh=11,-25` puts it right next to the spawn point).
- **Dashboard game (Cargo Loader):** see below.
- **Cockpit art:** `src/intro/cockpit.config.ts`. Set `frameImage` to a 16:9 PNG with transparent windows to replace the SVG frame. The instruments and lever share the same 1600×900 coordinate space, so they stay aligned.

## The gravitational anomaly (hidden course)

Fly off the right edge of the galaxy map. A warm glow on the right horizon and
a "Gravitational anomaly" sign point the way. Fly through the START gate to get
a 3-2-1 countdown, then pass the six rings in order (the next one pulses amber,
passed ones turn green), slingshotting around three black holes and five
planets, and dive into the wormhole. That opens the Secret transmission.
Touching a planet or crossing an event horizon respawns you at the last ring.
Inside the course the controls are ship-relative: A/D turn, W thrusts along the
nose (with grip, so the ship goes where it points), S brakes. Coasting is pure
momentum, so slingshots and the trajectory preview behave physically. R respawns, T toggles the dotted trajectory
preview, Esc leaves. Best time and a "found it" star near the entrance are
stored in this browser's localStorage.

- **Layout and tuning:** `src/scene/course/courseConfig.ts`, with comments for
  every value. It holds the zone, `physics` (G, thrust, grip, brake, turn rate, drag, speed cap,
  softening fade, step size), the gate, `rings` (in pass order), `wormhole`,
  `blackHoles` (position, mass, softening, horizon, visual size), and
  `planets` (position, radius, mass, look). Gravity is
  `G · mass / (dist² + softening²)`, integrated at a fixed 240 Hz. Planets
  reuse the About page's planet shader; `palette` picks one of the colour sets
  at the bottom of the file.
- **Secret content:** `content/secret.json` has `title`, `text` (Markdown),
  `image` (optional, a path under `/public`), and `link` (`{ label, url }`;
  leave `url` empty to hide it).
- **Testing the ending in dev:** run
  `document.dispatchEvent(new Event('course:finish-line'))` in the console
  while racing, and the ship is dropped next to an open wormhole (dev builds
  only).
- **Reset your own progress:** clear `tl:course-best` and `tl:anomaly-found`
  from localStorage.

Code: `src/scene/course/` (`Course.tsx` visuals and keys, `coursePhysics.ts`,
`courseState.ts`), HUD in `src/ui/CourseHud.tsx`, the overlay in
`src/ui/SecretPage.tsx`.

## Cargo Loader (the dashboard game)

A falling-block game on the cockpit's right console, playable on the start
screen. Click the screen to play. Esc or clicking elsewhere pauses it, and
pulling the hyperdrive lever fades it out. It's hidden on touch devices and
very small windows.

| Key | Action |
| --- | --- |
| ← / → | Move |
| ↓ | Soft drop (straight to the floor, doesn't lock) |
| Space | Hard drop |
| ↑ or X | Rotate clockwise |
| Z | Rotate counterclockwise |
| A | Rotate 180° |
| Shift or C | Hold |
| R | Restart |
| Esc | Pause (a second Esc skips the intro) |

Everything tunable is in `src/intro/stacker/config.ts`:

- **Handling** (`HANDLING`): `das` (75 ms), `arr` (0 = instant to the wall), `dcd` (0), `sdf` (`Infinity` = instant soft
  drop). All in milliseconds of real time, so it plays the same at 60, 120, or
  144 Hz. `carryDas` (on): a held direction's charge
  carries into the next piece. `softDropDelay` (120 ms): with soft drop held,
  each new piece gets this long at the top before it drops, so you can move it
  first; a fresh press drops at once.
  While soft dropping, sideways moves drop the piece after every cell, so it
  falls into the first gap it passes rather than skimming over it.
- **Keybinds** (`KEYS`): each action maps to a list of `KeyboardEvent.code`
  values (physical keys, e.g. `'KeyX'`, `'ArrowUp'`, `'ShiftLeft'`). Add or
  replace codes; a code should appear under only one action.
- **Rules** (`RULES`): `timeLimit` (60 000 ms; 0 = endless), lock delay (500 ms), lock resets (15), lines per level
  (10), gravity cap (cells/s), and next-queue length.
- **Colours** (`THEME`).

Each game is a one-minute run scored by lines cleared (topping out ends it
early). A score that makes the top 10 asks for a name (12 characters max) and
lands on the leaderboard, shown on the idle and results screens. The board
lives in this browser's localStorage (`tl:cargo-scores`, last name in
`tl:cargo-name`), so each visitor sees their own; clear those keys to reset it.

Rules follow modern guideline play: 7-bag, hold, ghost, SRS+ with TETR.IO's
kick tables (including 180° and the symmetric I kicks), no ARE or line-clear
delay. Each cleared line lights a segment of the decorative CHARGE meter on the
right side panel. Set `game: false` in `src/intro/cockpit.config.ts` to remove
the screen; the SYSTEMS readout returns in its place.

Code: `engine.ts` (pure game logic), `pieces.ts` (shapes, kick tables),
`input.ts` (DAS/ARR from key timestamps), `render.ts` (canvas), `leaderboard.ts`
(scores in localStorage), `Stacker.tsx`
(focus, key listeners, loop), and `engine.test.ts`.

## How it fits together

- `src/scene/`: one persistent R3F `<Canvas>` for the whole visit (sky, nebula, warp streaks, galaxies). It never remounts, so the jump flows straight into the galaxy map.
- `src/intro/`: the cockpit (SVG/DOM layered over the canvas), the lever, and the overlays (flash, vignette).
- `src/state/`: small zustand stores. The intro phase and the hovered, active, and docked cluster are read inside `useFrame` without re-rendering.
- Routing: `HashRouter`, so refreshes work on GitHub Pages. The route decides the active cluster. The camera rig flies there and the page opens once it has "docked".
- Section pages are plain HTML over a dimmed, blurred scene.

## Accessibility and performance

- **Reduced motion** (`prefers-reduced-motion`): the jump becomes a crossfade. There is no camera drift, parallax, flights, shake, twinkle, cluster spin, or globe spin, and Motion transitions drop to opacity only.
- **Keyboard:** the lever is focusable (Enter or Space). On the galaxy, WASD or the arrow keys fly the ship and Space enters the nearest cluster in range. Click-and-drag on empty space pans the view; flying eases it back onto the ship. The destination bar mirrors every cluster, and Esc skips the intro or closes a page. Flight keys are ignored while a page is open or while typing in a field.
- **Adaptive resolution:** the canvas steps its pixel ratio down on slow GPUs and drops to 1× while a page covers the scene.
- **WebGL fallback:** if WebGL is unavailable or the scene crashes, the site shows a static starfield and stays fully navigable.
- **One render loop at a time:** while About is open, the galaxy canvas pauses (it holds its last frame behind the blur). Planet Scan's own canvas mounts only on that tab, with the pixel ratio capped at 1.5×.
- **Bundles:** vendor chunks (three, r3f, react, motion) are split for caching. The Map section (d3 + world outline) is lazy-loaded.
