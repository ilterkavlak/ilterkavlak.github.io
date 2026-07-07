# ilterkavlak.github.io

Personal site of İlter Kavlak — SRE / Cloud Engineer. Plain static HTML, no build
step, deployed by GitHub Pages straight from `main`.

## Principles

- **Minimal complexity.** No framework, no bundler, no `package.json`. Just HTML, one
  CSS file, and one small JS file.
- **Minimal dependencies.** The only third-party resource is **Google Fonts**
  (Space Grotesk + Manrope + JetBrains Mono), `@import`ed once at the top of
  `assets/styles.css` so pages only link that one stylesheet. Icons are inline SVG or
  emoji — no icon library. There is no npm supply chain to audit.
- **Relative links everywhere.** Pages reference assets and each other with relative
  paths (and link to explicit `index.html` files), so the site renders both by
  double-clicking a file (`file://`) and when served — no build or dev server required.
- **Light theme that follows the OS.** `assets/styles.css` defines light tokens by
  default and dark overrides under `@media (prefers-color-scheme: dark)`. Nothing to
  toggle — it tracks the system setting.

## Layout

```
index.html            Home — hero + contact at top, About, Experience, links out
assets/styles.css     The entire theme (light + dark). Every page links this.
assets/app.js         renderCards() for listing pages + fills the year.
data/projects.js      window.PROJECTS — drives the Projects listing
data/posts.js         window.POSTS — drives the Blog listing (empty => "under construction")
data/games.js         window.GAMES — drives the Games listing
projects/index.html   Projects listing (reads data/projects.js)
projects/<slug>/      One folder per project (see projects/nitpick/)
blog/index.html       Blog listing (reads data/posts.js)
blog/<slug>/          One folder per post
games/index.html      Games listing (reads data/games.js)
games/<slug>/         One folder per game (see games/splash/)
templates/            Copy-me starting points: project.html, post.html, game.html
```

## Adding content (the pattern)

Every category works the same way — **two steps, no listing markup to edit:**

### A blog post
1. Copy `templates/post.html` → `blog/<slug>/index.html`, replace the `{{PLACEHOLDER}}`s,
   write the body.
2. Prepend an entry to `data/posts.js` (newest first). The `href` is relative to the
   listing page, so it's just `<slug>/index.html`:
   ```js
   { title: 'My post', href: 'my-post/index.html',
     meta: '2026-07-07 · 5 min read', tagline: 'One-line summary.', foot: 'Read →' }
   ```

### A project
1. Copy `templates/project.html` → `projects/<slug>/index.html` and fill it in.
   (`projects/nitpick/index.html` is a richer worked example.)
2. Prepend an entry to `data/projects.js`.

### A game
1. Copy `templates/game.html` → `games/<slug>/index.html` and build the game (keep it
   dependency-free). (`games/splash/index.html` is a worked example.)
2. Prepend an entry to `data/games.js`.

Card fields: `title`, `href`, `meta` (optional), `tagline` (optional), `foot` (optional,
defaults to "Open →"). If a data array is empty, its listing shows a friendly
"under construction" state instead of cards.

## Preview locally

Just **open `index.html` in a browser** (double-click it). Because everything uses
relative paths and the data files load as `<script src=...>`, subpages, styles, and card
lists all render over `file://` — no server needed.

If you prefer a server (closer to production, clean URLs without `index.html`):

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

> Note: internal links point at explicit `index.html` files so `file://` navigation works.
> `<link rel="canonical">` tags still use clean URLs (e.g. `/projects/`) for search engines.
