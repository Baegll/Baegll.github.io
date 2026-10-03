import { Features, transform } from "lightningcss"
import { transform as transpile } from "esbuild"
import config from "./config"
import { joinStyles } from "../quartz/util/theme"
import { joinSegments, pathToRoot, type FullSlug, type RelativeURL } from "../quartz/util/path"
import type { JSResource, StaticResources } from "../quartz/util/resources"
import type { BuildCtx } from "../quartz/util/ctx"

// component styles
import clipboardStyle from "../quartz/components/styles/clipboard.scss?quartz-css"
import breadcrumbsStyle from "../quartz/components/styles/breadcrumbs.scss?quartz-css"
import contentMetaStyle from "../quartz/components/styles/contentMeta.scss?quartz-css"
import recentNotesStyle from "../quartz/components/styles/recentNotes.scss?quartz-css"
import searchStyle from "../quartz/components/styles/search.scss?quartz-css"
import darkmodeStyle from "../quartz/components/styles/darkmode.scss?quartz-css"
import readermodeStyle from "../quartz/components/styles/readermode.scss?quartz-css"
import explorerStyle from "../quartz/components/styles/explorer.scss?quartz-css"
import graphStyle from "../quartz/components/styles/graph.scss?quartz-css"
import tocStyle from "../quartz/components/styles/toc.scss?quartz-css"
import backlinksStyle from "../quartz/components/styles/backlinks.scss?quartz-css"
import footerStyle from "../quartz/components/styles/footer.scss?quartz-css"
import listPageStyle from "../quartz/components/styles/listPage.scss?quartz-css"
import popoverStyle from "../quartz/components/styles/popover.scss?quartz-css"
import customStyle from "../quartz/styles/custom.scss?quartz-css"

// component scripts
import clipboardScript from "../quartz/components/scripts/clipboard.inline?quartz-inline"
import searchScript from "../quartz/components/scripts/search.inline?quartz-inline"
import darkmodeScript from "../quartz/components/scripts/darkmode.inline?quartz-inline"
import readermodeScript from "../quartz/components/scripts/readermode.inline?quartz-inline"
import explorerScript from "../quartz/components/scripts/explorer.inline?quartz-inline"
import graphScript from "../quartz/components/scripts/graph.inline?quartz-inline"
import tocScript from "../quartz/components/scripts/toc.inline?quartz-inline"
import popoverScript from "../quartz/components/scripts/popover.inline?quartz-inline"
import spaRouterScript from "../quartz/components/scripts/spa.inline?quartz-inline"

const headerStyle = `
header {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 2rem 0;
  gap: 1.5rem;
}

header h1 {
  margin: 0;
  flex: auto;
}
`

const articleTitleStyle = `
.article-title {
  margin: 2rem 0 0 0;
}
`

const tagListStyle = `
.tags {
  list-style: none;
  display: flex;
  padding-left: 0;
  gap: 0.4rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}

.section-li > .section > .tags {
  justify-content: flex-end;
}

.tags > li {
  display: inline-block;
  white-space: nowrap;
  margin: 0;
  overflow-wrap: normal;
}

a.internal.tag-link {
  border-radius: 8px;
  background-color: var(--highlight);
  padding: 0.2rem 0.4rem;
  margin: 0 0.1rem;
}
`

const pageTitleStyle = `
.page-title {
  font-size: 1.75rem;
  margin: 0;
  font-family: var(--titleFont);
}
`

const pageListStyle = `
.section h3 {
  margin: 0;
}

.section > .tags {
  margin: 0;
}
`

/**
 * Ids of the scrollable lists that get a fade-out gradient when they overflow.
 * One per list-rendering component, in the order the layouts declare them.
 */
export const overflowListIds = {
  contentExplorer: "list-0",
  toc: "list-1",
  backlinks: "list-2",
  listExplorer: "list-3",
} as const

function overflowListScript(id: string) {
  return `
document.addEventListener("nav", (e) => {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const parentUl = entry.target.parentElement
      if (!parentUl) return
      if (entry.isIntersecting) {
        parentUl.classList.remove("gradient-active")
      } else {
        parentUl.classList.add("gradient-active")
      }
    }
  })

  const ul = document.getElementById("${id}")
  if (!ul) return

  const end = ul.querySelector(".overflow-end")
  if (!end) return

  observer.observe(end)
  window.addCleanup(() => observer.disconnect())
})
`
}

// Same ordering Quartz used: each component's resources in layout order, de-duplicated.
const componentCss = [
  headerStyle,
  clipboardStyle,
  breadcrumbsStyle,
  articleTitleStyle,
  contentMetaStyle,
  tagListStyle,
  recentNotesStyle,
  pageTitleStyle,
  searchStyle,
  darkmodeStyle,
  readermodeStyle,
  explorerStyle,
  graphStyle,
  tocStyle,
  backlinksStyle,
  footerStyle,
  listPageStyle,
  pageListStyle,
]

const beforeDOMLoaded = [darkmodeScript, readermodeScript]

const afterDOMLoaded = [
  clipboardScript,
  searchScript,
  explorerScript,
  overflowListScript(overflowListIds.contentExplorer),
  graphScript,
  tocScript,
  overflowListScript(overflowListIds.toc),
  overflowListScript(overflowListIds.backlinks),
  overflowListScript(overflowListIds.listExplorer),
]

async function joinScripts(scripts: string[]): Promise<string> {
  // wrap with iife to prevent scope collision
  const script = scripts.map((script) => `(function () {${script}})();`).join("\n")

  // minify with esbuild
  const res = await transpile(script, {
    minify: true,
  })

  return res.code
}

function globalAfterDOMLoaded() {
  const cfg = config.configuration
  const scripts = [...afterDOMLoaded]
  if (cfg.enablePopovers) {
    scripts.push(popoverScript)
  }
  if (cfg.enableSPA) {
    scripts.push(spaRouterScript)
  } else {
    scripts.push(`
      window.spaNavigate = (url, _) => window.location.assign(url)
      window.addCleanup = () => {}
      const event = new CustomEvent("nav", { detail: { url: document.body.dataset.slug } })
      document.dispatchEvent(event)
    `)
  }
  return scripts
}

export function buildStylesheet(): string {
  const cfg = config.configuration
  const css = [...componentCss]
  if (cfg.enablePopovers) {
    css.push(popoverStyle)
  }
  const stylesheet = joinStyles(cfg.theme, "", ...css, customStyle)
  return transform({
    filename: "index.css",
    code: Buffer.from(stylesheet),
    minify: true,
    targets: {
      safari: (15 << 16) | (6 << 8), // 15.6
      ios_saf: (15 << 16) | (6 << 8), // 15.6
      edge: 115 << 16,
      firefox: 102 << 16,
      chrome: 109 << 16,
    },
    include: Features.MediaQueries,
  }).code.toString()
}

export function buildPrescript(): Promise<string> {
  return joinScripts(beforeDOMLoaded)
}

export function buildPostscript(): Promise<string> {
  return joinScripts(globalAfterDOMLoaded())
}

/** Resources contributed by the markdown transformers (KaTeX, callouts, mermaid, ...). */
export function transformerResources(ctx: BuildCtx): StaticResources {
  const resources: StaticResources = { css: [], js: [] }
  for (const transformer of config.plugins.transformers) {
    const res = transformer.externalResources?.(ctx)
    if (res?.js) resources.js.push(...res.js)
    if (res?.css) resources.css.push(...res.css)
  }
  return resources
}

/** The stylesheet/script list for a page, as Quartz's `pageResources` built it. */
export function pageResources(
  baseDir: FullSlug | RelativeURL,
  staticResources: StaticResources,
): StaticResources {
  const contentIndexPath = joinSegments(baseDir, "static/contentIndex.json")
  const contentIndexScript = `const fetchData = fetch("${contentIndexPath}").then(data => data.json())`

  const resources: StaticResources = {
    css: [
      {
        content: joinSegments(baseDir, "index.css"),
      },
      ...staticResources.css,
    ],
    js: [
      {
        src: joinSegments(baseDir, "prescript.js"),
        loadTime: "beforeDOMReady",
        contentType: "external",
      },
      {
        loadTime: "beforeDOMReady",
        contentType: "inline",
        spaPreserve: true,
        script: contentIndexScript,
      },
      ...staticResources.js,
    ],
  }

  resources.js.push({
    src: joinSegments(baseDir, "postscript.js"),
    loadTime: "afterDOMReady",
    moduleType: "module",
    contentType: "external",
  } satisfies JSResource)

  return resources
}

export function resourcesForSlug(slug: FullSlug, ctx: BuildCtx): StaticResources {
  return pageResources(pathToRoot(slug), transformerResources(ctx))
}
