import path from "node:path"
import { promises as fs } from "node:fs"
import esbuild from "esbuild"
import * as sass from "sass"

// Reproduces the two esbuild loaders Quartz used for its components:
//   `import script from "./foo.inline?quartz-inline"` -> minified, bundled browser script as a string
//   `import style from "./foo.scss?quartz-css"`       -> compiled CSS as a string
// The strings are stitched together into /blog/index.css, prescript.js and postscript.js.
const INLINE_QUERY = "?quartz-inline"
const CSS_QUERY = "?quartz-css"
const INLINE_PREFIX = "\0quartz-inline:"
const CSS_PREFIX = "\0quartz-css:"
// suffix keeps Vite's own TS/CSS plugins from claiming the virtual modules
const SUFFIX = ".mjs"

async function resolveFile(base, candidates) {
  for (const candidate of candidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {}
  }
  throw new Error(`[quartz] could not resolve ${base}`)
}

export async function bundleInlineScript(fp) {
  let text = await fs.readFile(fp, "utf8")

  // remove default exports that we manually inserted
  text = text.replace("export default", "")
  text = text.replace("export", "")

  const sourcefile = path.relative(path.resolve("."), fp)
  const resolveDir = path.dirname(sourcefile)
  const transpiled = await esbuild.build({
    stdin: {
      contents: text,
      loader: "ts",
      resolveDir,
      sourcefile,
    },
    write: false,
    bundle: true,
    minify: true,
    platform: "browser",
    format: "esm",
  })
  return transpiled.outputFiles[0].text
}

export function compileScss(fp) {
  return sass.compile(fp).css
}

export default function quartzResources({ contentDir }) {
  return {
    name: "quartz-resources",
    enforce: "pre",
    async resolveId(source, importer) {
      for (const [query, prefix, exts] of [
        [INLINE_QUERY, INLINE_PREFIX, ["", ".ts", ".js"]],
        [CSS_QUERY, CSS_PREFIX, [""]],
      ]) {
        if (source.endsWith(query) && importer) {
          const bare = source.slice(0, -query.length)
          const importerPath = importer.startsWith(CSS_PREFIX) || importer.startsWith(INLINE_PREFIX)
            ? importer.slice(importer.indexOf(":") + 1, -SUFFIX.length)
            : importer.split("?")[0]
          const base = path.resolve(path.dirname(importerPath), bare)
          const fp = await resolveFile(base, exts.map((ext) => base + ext))
          return prefix + fp.split(path.sep).join("/") + SUFFIX
        }
      }
    },
    async load(id) {
      if (id.startsWith(INLINE_PREFIX)) {
        const fp = id.slice(INLINE_PREFIX.length, -SUFFIX.length)
        this.addWatchFile(fp)
        return `export default ${JSON.stringify(await bundleInlineScript(fp))}`
      }
      if (id.startsWith(CSS_PREFIX)) {
        const fp = id.slice(CSS_PREFIX.length, -SUFFIX.length)
        this.addWatchFile(fp)
        return `export default ${JSON.stringify(compileScss(fp))}`
      }
    },
    configureServer(server) {
      // blog markdown lives outside the module graph; reload pages when it changes
      const dir = path.resolve(contentDir)
      server.watcher.add(dir)
      const reload = (file) => {
        if (path.resolve(file).startsWith(dir)) {
          server.ws.send({ type: "full-reload" })
        }
      }
      server.watcher.on("add", reload)
      server.watcher.on("change", reload)
      server.watcher.on("unlink", reload)
    },
  }
}
