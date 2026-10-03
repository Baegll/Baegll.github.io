import type { APIRoute } from "astro"
import { buildPrescript } from "../../blog/resources"

export const GET: APIRoute = async () =>
  new Response(await buildPrescript(), { headers: { "Content-Type": "text/javascript" } })
