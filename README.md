# Baegll.github.io

Personal portfolio and blog for Natalie Johanek.

- **Landing page** — `index.html`
- **Projects** — `projects/index.html`
- **Blog** — [Quartz v4](https://quartz.jzhao.xyz/) in `blog/`

## Local Development

```bash
bash serve.sh        # Build & serve at http://localhost:8080
bash serve.sh 3000   # Custom port
```

## How It Works

`design-tokens.json` is the single source of truth for fonts, colors, and site metadata. HTML pages load it at runtime via `assets/theme.js`; Quartz reads it at build time.

## Deployment

Pushes to `main` trigger a GitHub Actions workflow that builds Quartz, copies static files into `_site/`, and deploys to GitHub Pages.
