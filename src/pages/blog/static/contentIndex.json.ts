import type { APIRoute } from "astro"
import config from "../../../blog/config"
import { getBlogContent } from "../../../blog/content"
import {
  buildContentIndex,
  simplifiedContentIndex,
} from "../../../quartz/plugins/emitters/contentIndex"

// powers search, the graph view and the explorer
export const GET: APIRoute = async () => {
  const { content } = await getBlogContent()
  const cfg = config.configuration
  const index = simplifiedContentIndex(buildContentIndex(cfg, content))
  return new Response(JSON.stringify(index), { headers: { "Content-Type": "application/json" } })
}
