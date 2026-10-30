# Baegll.github.io

Personal portfolio and blog for Natalie Johanek, built with [Astro](https://astro.build/).

- **Landing page** — `src/pages/index.astro`
- **Projects** — `src/pages/projects/index.astro`
- **Privacy** — `src/pages/privacy/index.astro`
- **Blog** — markdown in `blog/content/`, rendered by the routes in `src/pages/blog/`

## Local Development

```bash
npm install
npm run dev       # dev server at http://localhost:4321
npm run build     # static build into dist/
npm run preview   # serve the build
```

## How It Works

`design-tokens.json` is the single source of truth for fonts, colors, and site metadata. `ThemeHead.astro` renders the tokens at build time; `public/assets/theme.js` applies one saved theme across the site. `SiteHeader.astro` and `Footer.astro` provide the shared navigation, including on blog articles and project tools. About and Contact are native homepage anchors. `WritingList.astro` builds the homepage and writing index from published Markdown, sorted by publication date.

The blog uses the [Quartz v4](https://quartz.jzhao.xyz/) Markdown plugins, browser scripts, and styles in `src/quartz/` (MIT, see `src/quartz/LICENSE.txt`), with Astro components in `src/blog/`. Obsidian-style `[[wikilinks]]`, callouts, search, graph view, backlinks, RSS, sitemap, and social images are retained. Navigation uses ordinary page loads throughout; graph and backlinks are available under “Explore connections.”

Run `npm run check` for diagnostics and `npm run build && npm run check:links` to validate internal links, assets, and anchor targets in the generated site.

Three responsive layout studies are at `/mockups/`: wide masthead (`editorial`), sidebar index (`field-notes`), and asymmetric grid (`studio`). All use the shared design tokens, fonts, theme preference, and existing identity; the studies compare layout and composition.

Open navigation follow-ups are tracked in [the website TODO list](docs/TODO.md).

For production-build latency measurements, run `npm run build` then `npm run perf`. The runner records paint timing, layout shifts, blocking time, transfer size, and a theme-feedback probe. See [performance methodology and baselines](docs/performance.md) for before/after results, comparison commands, and the distinction between local lab metrics and real-user Core Web Vitals.

## Deployment

Pushes to `main` trigger a GitHub Actions workflow that runs `astro build` and deploys the output to GitHub Pages.
