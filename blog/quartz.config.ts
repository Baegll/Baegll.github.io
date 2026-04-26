import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"
import { readFileSync } from "fs"

const tokens = JSON.parse(readFileSync("../design-tokens.json", "utf-8"))

/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: tokens.site.blogTitle,
    pageTitleSuffix: "",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-US",
    baseUrl: `${tokens.site.baseUrl}/blog`,
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: tokens.fonts.heading,
        body: tokens.fonts.body,
        code: tokens.fonts.code,
      },
      colors: {
        lightMode: {
          light: tokens.colors.lightMode.background,
          lightgray: tokens.colors.lightMode.border,
          gray: tokens.colors.lightMode.muted,
          darkgray: tokens.colors.lightMode.secondary,
          dark: tokens.colors.lightMode.primary,
          secondary: tokens.colors.lightMode.cta,
          tertiary: tokens.colors.lightMode.ctaHover,
          highlight: tokens.colors.lightMode.highlight,
          textHighlight: tokens.colors.lightMode.textHighlight,
        },
        darkMode: {
          light: tokens.colors.darkMode.background,
          lightgray: tokens.colors.darkMode.border,
          gray: tokens.colors.darkMode.muted,
          darkgray: tokens.colors.darkMode.secondary,
          dark: tokens.colors.darkMode.primary,
          secondary: tokens.colors.darkMode.cta,
          tertiary: tokens.colors.darkMode.ctaHover,
          highlight: tokens.colors.darkMode.highlight,
          textHighlight: tokens.colors.darkMode.textHighlight,
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
      Plugin.CustomOgImages(),
    ],
  },
}

export default config
