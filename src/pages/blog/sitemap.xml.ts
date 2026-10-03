import type { APIRoute } from "astro"
import config from "../../blog/config"
import { getBlogContent } from "../../blog/content"
import { buildContentIndex, generateSiteMap } from "../../quartz/plugins/emitters/contentIndex"

export const GET: APIRoute = async () => {
  const { content } = await getBlogContent()
  const cfg = config.configuration
  const sitemap = generateSiteMap(cfg, buildContentIndex(cfg, content))
  return new Response(sitemap, { headers: { "Content-Type": "application/xml" } })
}
