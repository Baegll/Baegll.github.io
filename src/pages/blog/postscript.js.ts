import type { APIRoute } from "astro"
import { buildPostscript } from "../../blog/resources"

export const GET: APIRoute = async () =>
  new Response(await buildPostscript(), { headers: { "Content-Type": "text/javascript" } })
