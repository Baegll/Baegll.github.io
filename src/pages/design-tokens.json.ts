import { promises as fs } from "node:fs"
import type { APIRoute } from "astro"

// served verbatim: the portfolio pages load it at runtime through /assets/theme.js
export const GET: APIRoute = async () =>
  new Response(await fs.readFile("design-tokens.json", "utf8"), {
    headers: { "Content-Type": "application/json" },
  })
