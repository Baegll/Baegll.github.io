import type { APIRoute } from "astro"
import config from "../../blog/config"
import { getBlogContent } from "../../blog/content"
import {
  buildContentIndex,
  defaultOptions,
  generateRSSFeed,
} from "../../quartz/plugins/emitters/contentIndex"

export const GET: APIRoute = async () => {
  const { content } = await getBlogContent()
  const cfg = config.configuration
  const feed = generateRSSFeed(cfg, buildContentIndex(cfg, content), defaultOptions.rssLimit)
  return new Response(feed, { headers: { "Content-Type": "application/xml" } })
}
