import { Components, Jsx, toJsxRuntime } from "hast-util-to-jsx-runtime"
import { Node, Root } from "hast"
import { Fragment, jsx, jsxs } from "preact/jsx-runtime"
import { render } from "preact-render-to-string"
import { type FilePath } from "./path"

const customComponents: Components = {
  table: (props) => jsx("div", { class: "table-container", children: jsx("table", props) }),
}

export function htmlToJsx(fp: FilePath, tree: Node) {
  try {
    return toJsxRuntime(tree as Root, {
      Fragment,
      jsx: jsx as Jsx,
      jsxs: jsxs as Jsx,
      elementAttributeNameCase: "html",
      components: customComponents,
    })
  } catch (e) {
    throw new Error(`Failed to parse Markdown in \`${fp}\` into JSX`, { cause: e })
  }
}

/** Renders a processed HTML tree to a string exactly as Quartz's page renderer did. */
export function htmlToString(fp: FilePath, tree: Node): string {
  return render(htmlToJsx(fp, tree) as Parameters<typeof render>[0])
}
