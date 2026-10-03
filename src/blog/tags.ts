import type { Root } from "hast"
import config from "./config"
import { getBlogContent } from "./content"
import { i18n } from "../quartz/i18n"
import { type FullSlug, getAllSegmentPrefixes, joinSegments } from "../quartz/util/path"
import type { QuartzPluginData } from "../quartz/plugins/vfile"

export interface TagPageData {
  tag: string
  fileData: QuartzPluginData
  tree: Root
}

/** Every tag (including parent segments of nested tags) plus the "index" listing. */
export async function getTagPages(): Promise<TagPageData[]> {
  const { content, allFiles } = await getBlogContent()
  const locale = config.configuration.locale
  const tags: Set<string> = new Set(
    allFiles.flatMap((data) => data.frontmatter?.tags ?? []).flatMap(getAllSegmentPrefixes),
  )

  tags.add("index")

  const tagDescriptions: Record<string, TagPageData> = Object.fromEntries(
    [...tags].map((tag) => {
      const title =
        tag === "index"
          ? i18n(locale).pages.tagContent.tagIndex
          : `${i18n(locale).pages.tagContent.tag}: ${tag}`
      const fileData: QuartzPluginData = {
        slug: joinSegments("tags", tag) as FullSlug,
        frontmatter: { title, tags: [] },
      }
      return [tag, { tag, fileData, tree: { type: "root", children: [] } as Root }]
    }),
  )

  // a markdown file at tags/<tag>.md provides that tag page's description
  for (const [tree, file] of content) {
    const slug = file.data.slug!
    if (slug.startsWith("tags/")) {
      const tag = slug.slice("tags/".length)
      if (tags.has(tag)) {
        tagDescriptions[tag] = { tag, fileData: file.data, tree }
        if (file.data.frontmatter && file.data.frontmatter.title === tag) {
          file.data.frontmatter.title = `${i18n(locale).pages.tagContent.tag}: ${tag}`
        }
      }
    }
  }

  return [...tags].map((tag) => tagDescriptions[tag])
}
