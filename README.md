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

`design-tokens.json` is the single source of truth for fonts, colors, and site metadata. Portfolio pages load it at runtime via `public/assets/theme.js`; the blog reads it at build time (`src/blog/config.ts`).

The blog keeps the look and behavior of the [Quartz v4](https://quartz.jzhao.xyz/) site it was migrated from: the markdown plugins, browser scripts, and styles live in `src/quartz/` (MIT, see `src/quartz/LICENSE.txt`), and the Astro components in `src/blog/` render the pages. Obsidian-style `[[wikilinks]]`, callouts, search, the graph view, backlinks, RSS, sitemap, and social images all work as before.

## Deployment

Pushes to `main` trigger a GitHub Actions workflow that runs `astro build` and deploys the output to GitHub Pages.
