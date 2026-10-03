import path from "node:path"
import { promises as fs } from "node:fs"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"
import { VFile } from "vfile"
import type { Root as MDRoot } from "mdast"
import type { Root as HTMLRoot } from "hast"
import config, { CONTENT_DIR } from "./config"
import type { BuildCtx } from "../quartz/util/ctx"
import type { ProcessedContent, QuartzPluginData } from "../quartz/plugins/vfile"
import { type FilePath, type FullSlug, slugifyFilePath } from "../quartz/util/path"

export interface BlogContent {
  ctx: BuildCtx
  /** every file in the content directory, as paths relative to it */
  allFilePaths: FilePath[]
  content: ProcessedContent[]
  allFiles: QuartzPluginData[]
}

async function listFiles(root: string, ignorePatterns: string[]): Promise<FilePath[]> {
  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
    .map((fp) => fp.split(path.sep).join("/") as FilePath)
    .filter((fp) => !ignorePatterns.includes(fp.split("/")[0]))
    .sort()
}

// mirrors Quartz's RemoveDrafts filter
function isDraft(file: VFile) {
  const draftFlag: boolean =
    file.data?.frontmatter?.draft === true || file.data?.frontmatter?.draft === "true"
  return draftFlag
}

async function processContent(): Promise<BlogContent> {
  const cfg = config
  const allFilePaths = await listFiles(CONTENT_DIR, cfg.configuration.ignorePatterns)
  const ctx: BuildCtx = {
    argv: { directory: CONTENT_DIR },
    cfg,
    allSlugs: allFilePaths.map((fp) => slugifyFilePath(fp)),
  }

  const transformers = cfg.plugins.transformers
  const mdProcessor = unified()
    .use(remarkParse)
    .use(transformers.flatMap((plugin) => plugin.markdownPlugins?.(ctx) ?? []))
  const htmlProcessor = unified()
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(transformers.flatMap((plugin) => plugin.htmlPlugins?.(ctx) ?? []))

  // markdown pass for every file first (frontmatter may register alias slugs), then html
  const mdContent: [MDRoot, VFile][] = []
  for (const relativePath of allFilePaths.filter((fp) => fp.endsWith(".md"))) {
    const filePath = path.posix.join(CONTENT_DIR, relativePath) as FilePath
    const raw = await fs.readFile(filePath, "utf8")
    const file = new VFile({ path: filePath, value: raw.trim() })
    for (const plugin of transformers.filter((p) => p.textTransform)) {
      file.value = plugin.textTransform!(ctx, file.value.toString())
    }

    file.data.filePath = filePath
    file.data.relativePath = relativePath
    file.data.slug = slugifyFilePath(relativePath)

    const ast = mdProcessor.parse(file)
    const newAst = (await mdProcessor.run(ast, file)) as MDRoot
    mdContent.push([newAst, file])
  }

  const content: ProcessedContent[] = []
  for (const [ast, file] of mdContent) {
    const newAst = (await htmlProcessor.run(ast, file)) as HTMLRoot
    content.push([newAst, file])
  }

  const published = content.filter(([_tree, file]) => !isDraft(file))
  return {
    ctx,
    allFilePaths,
    content: published,
    allFiles: published.map(([_tree, file]) => file.data),
  }
}

let cached: Promise<BlogContent> | undefined
let cachedKey: string | undefined

async function contentKey() {
  const fps = await listFiles(CONTENT_DIR, config.configuration.ignorePatterns)
  const stats = await Promise.all(fps.map((fp) => fs.stat(path.join(CONTENT_DIR, fp))))
  return fps.map((fp, i) => `${fp}:${stats[i].mtimeMs}`).join("|")
}

/** Parses the blog once per build (re-parses in dev when a content file changes). */
export async function getBlogContent(): Promise<BlogContent> {
  if (import.meta.env.DEV) {
    const key = await contentKey()
    if (key !== cachedKey) {
      cachedKey = key
      cached = undefined
    }
  }
  cached ??= processContent()
  return cached
}

export async function getPage(slug: FullSlug): Promise<ProcessedContent | undefined> {
  const { content } = await getBlogContent()
  return content.find(([_tree, file]) => file.data.slug === slug)
}
