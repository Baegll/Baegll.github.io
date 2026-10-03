import path from "node:path"
import { promises as fs } from "node:fs"
import type { APIRoute, GetStaticPaths } from "astro"
import { CONTENT_DIR } from "../../blog/config"
import { getBlogContent } from "../../blog/content"
import { generateOgImage } from "../../blog/og"
import { type FilePath, slugifyFilePath } from "../../quartz/util/path"
import type { QuartzPluginData } from "../../quartz/plugins/vfile"

type Props = { kind: "asset"; source: FilePath } | { kind: "og-image"; fileData: QuartzPluginData }

// Non-markdown files from the content folder (images, attachments) and the
// generated `<slug>-og-image.webp` social cards.
export const getStaticPaths = (async () => {
  const { allFilePaths, content } = await getBlogContent()
  const assets = allFilePaths
    .filter((fp) => !fp.endsWith(".md"))
    .map((fp) => ({
      params: { file: slugifyFilePath(fp) },
      props: { kind: "asset", source: fp } satisfies Props,
    }))
  const ogImages = content
    .filter(([_tree, file]) => file.data.frontmatter?.socialImage === undefined)
    .map(([_tree, file]) => ({
      params: { file: `${file.data.slug!}-og-image.webp` },
      props: { kind: "og-image", fileData: file.data } satisfies Props,
    }))
  return [...assets, ...ogImages]
}) satisfies GetStaticPaths

const mimeTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
}

export const GET: APIRoute<Props> = async ({ props }) => {
  if (props.kind === "og-image") {
    const image = await generateOgImage(props.fileData)
    return new Response(new Uint8Array(image), { headers: { "Content-Type": "image/webp" } })
  }

  const data = await fs.readFile(path.join(CONTENT_DIR, props.source))
  const type = mimeTypes[path.extname(props.source).toLowerCase()] ?? "application/octet-stream"
  return new Response(new Uint8Array(data), { headers: { "Content-Type": type } })
}
