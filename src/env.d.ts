// Quartz component resources, loaded as strings by src/blog/vite-plugin.mjs
declare module "*?quartz-inline" {
  const script: string
  export default script
}

declare module "*?quartz-css" {
  const css: string
  export default css
}

// micromorph ships types its package.json `exports` don't expose
declare module "micromorph" {
  export default function micromorph(from: Node, to: Node): Promise<void>
}
