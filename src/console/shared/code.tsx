import jsonLanguage from "highlight.js/lib/languages/json"
import { createLowlight } from "lowlight"
import { type ReactNode } from "react"

const lowlight = createLowlight()
lowlight.register({ json: jsonLanguage })

type CodeNode = {
  type: string
  value?: string
  properties?: { className?: readonly string[] }
  children?: CodeNode[]
}

/** JSON as `hljs-*` token spans, rendered without innerHTML. Pair with
 *  codeTokenClassName (shared/tokens.ts) on a parent element. */
export function JsonCode({ value }: { value: string }) {
  const tree = lowlight.highlight("json", value)

  return <>{renderNodes(tree.children as unknown as CodeNode[])}</>
}

/** Spans keyed by their character offset — the token's stable identity. */
function renderNodes(nodes: CodeNode[] | undefined, start = 0): ReactNode {
  let offset = start

  return nodes?.map((node) => {
    const nodeStart = offset
    offset += nodeLength(node)

    if (node.type === "text") {
      return node.value
    }

    if (node.type === "element") {
      return (
        <span className={node.properties?.className?.join(" ")} key={nodeStart}>
          {renderNodes(node.children, nodeStart)}
        </span>
      )
    }

    return null
  })
}

function nodeLength(node: CodeNode): number {
  if (node.type === "text") {
    return node.value?.length ?? 0
  }

  return (node.children ?? []).reduce(
    (total, child) => total + nodeLength(child),
    0
  )
}
