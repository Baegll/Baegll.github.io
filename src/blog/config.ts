import type { QuartzConfig } from "../quartz/cfg"
import { FrontMatter } from "../quartz/plugins/transformers/frontmatter"
import { CreatedModifiedDate } from "../quartz/plugins/transformers/lastmod"
import { SyntaxHighlighting } from "../quartz/plugins/transformers/syntax"
import { ObsidianFlavoredMarkdown } from "../quartz/plugins/transformers/ofm"
import { GitHubFlavoredMarkdown } from "../quartz/plugins/transformers/gfm"
import { TableOfContents } from "../quartz/plugins/transformers/toc"
import { CrawlLinks } from "../quartz/plugins/transformers/links"
import { Description } from "../quartz/plugins/transformers/description"
import { Latex } from "../quartz/plugins/transformers/latex"
import tokens from "../../design-tokens.json"

/** Directory (relative to the repo root) holding the blog's markdown. */
export const CONTENT_DIR = "blog/content"

/** Footer links shown on every blog page. */
export const footerLinks: Record<string, string> = {
  Home: `https://${tokens.site.baseUrl}`,
  Projects: `https://${tokens.site.baseUrl}/projects`,
  Privacy: `https://${tokens.site.baseUrl}/privacy`,
  GitHub: tokens.site.github,
}

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
      FrontMatter(),
      CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      GitHubFlavoredMarkdown(),
      TableOfContents(),
      CrawlLinks({ markdownLinkResolution: "shortest" }),
      Description(),
      Latex({ renderEngine: "katex" }),
    ],
  },
}

export default config
