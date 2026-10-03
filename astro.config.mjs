// @ts-check
import { defineConfig } from "astro/config"
import quartzResources from "./src/blog/vite-plugin.mjs"

export default defineConfig({
  site: "https://baegll.github.io",
  // keep the old URLs: /projects/index.html, /blog/<slug>.html, /blog/tags/<tag>.html
  build: {
    format: "preserve",
  },
  trailingSlash: "ignore",
  vite: {
    plugins: [quartzResources({ contentDir: "blog/content" })],
  },
})
