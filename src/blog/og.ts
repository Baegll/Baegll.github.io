import { promises as fs } from "node:fs"
import sharp from "sharp"
import satori, { type SatoriOptions } from "satori"
import config from "./config"
import { i18n } from "../quartz/i18n"
import { unescapeHTML } from "../quartz/util/escape"
import { loadEmoji, getIconCode } from "../quartz/util/emoji"
import { defaultImage, getSatoriFonts, type SocialImageOptions } from "../quartz/util/og"
import type { QuartzPluginData } from "../quartz/plugins/vfile"

const ICON_PATH = "public/blog/static/icon.png"

const options: SocialImageOptions = {
  colorScheme: "lightMode",
  width: 1200,
  height: 630,
  imageStructure: defaultImage,
  excludeRoot: false,
}

export const ogImageSize = { width: options.width, height: options.height }

let fontsPromise: Promise<SatoriOptions["fonts"]> | undefined
function getFonts() {
  const { header, body } = config.configuration.theme.typography
  fontsPromise ??= getSatoriFonts(header, body)
  return fontsPromise
}

/** Renders the `<slug>-og-image.webp` social card for a page. */
export async function generateOgImage(fileData: QuartzPluginData): Promise<Buffer> {
  const cfg = config.configuration
  const titleSuffix = cfg.pageTitleSuffix ?? ""
  const title =
    (fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title) + titleSuffix
  const description =
    fileData.frontmatter?.socialDescription ??
    fileData.frontmatter?.description ??
    unescapeHTML(fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description)

  const fonts = await getFonts()
  let iconBase64: string | undefined = undefined
  try {
    const iconData = await fs.readFile(ICON_PATH)
    iconBase64 = `data:image/png;base64,${iconData.toString("base64")}`
  } catch {
    console.warn(`Warning: Could not find icon at ${ICON_PATH}`)
  }

  const { width, height } = options
  const imageComponent = options.imageStructure({
    cfg,
    userOpts: options,
    title,
    description,
    fonts,
    fileData,
    iconBase64,
  })

  const svg = await satori(imageComponent as Parameters<typeof satori>[0], {
    width,
    height,
    fonts,
    loadAdditionalAsset: async (languageCode: string, segment: string) => {
      if (languageCode === "emoji") {
        return await loadEmoji(getIconCode(segment))
      }

      return languageCode
    },
  })

  return sharp(Buffer.from(svg)).webp({ quality: 40 }).toBuffer()
}
