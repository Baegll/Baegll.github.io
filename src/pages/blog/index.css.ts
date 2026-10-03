import type { APIRoute } from "astro"
import { buildStylesheet } from "../../blog/resources"

export const GET: APIRoute = () =>
  new Response(buildStylesheet(), { headers: { "Content-Type": "text/css" } })
