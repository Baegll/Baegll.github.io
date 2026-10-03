import type { APIRoute } from "astro"
import sharp from "sharp"

export const GET: APIRoute = async () => {
  const favicon = await sharp("public/blog/static/icon.png").resize(48, 48).toFormat("png").toBuffer()
  return new Response(new Uint8Array(favicon), { headers: { "Content-Type": "image/png" } })
}
