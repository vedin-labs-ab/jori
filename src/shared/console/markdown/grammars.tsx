import bash from "highlight.js/lib/languages/bash"
import css from "highlight.js/lib/languages/css"
import javascript from "highlight.js/lib/languages/javascript"
import json from "highlight.js/lib/languages/json"
import markdown from "highlight.js/lib/languages/markdown"
import python from "highlight.js/lib/languages/python"
import sql from "highlight.js/lib/languages/sql"
import typescript from "highlight.js/lib/languages/typescript"
import xml from "highlight.js/lib/languages/xml"
import yaml from "highlight.js/lib/languages/yaml"
import { createLowlight } from "lowlight"

// The grammars a reply is likely to quote, each a few kilobytes; anything
// else renders as plain text rather than pulling the whole catalog in.
// This module arrives on its own, after the first code block or on idle,
// so the chat's chunk carries none of it.
const lowlight = createLowlight({
  bash,
  css,
  javascript,
  json,
  markdown,
  python,
  sql,
  typescript,
  xml,
  yaml,
})

const aliases: Record<string, string> = {
  html: "xml",
  js: "javascript",
  jsx: "javascript",
  md: "markdown",
  py: "python",
  sh: "bash",
  shell: "bash",
  ts: "typescript",
  tsx: "typescript",
  yml: "yaml",
  zsh: "bash",
}

type HastNodes = ReturnType<typeof lowlight.highlight>["children"]
type HastNode =
  | HastNodes[number]
  | Extract<HastNodes[number], { type: "element" }>["children"][number]

/** Code as `hljs-*` spans for a language the palette knows, or as the
 *  plain text it is for one it does not. */
export function GrammarCode({
  code,
  language,
}: {
  code: string
  language: string
}) {
  const name = aliases[language] ?? language

  if (!lowlight.registered(name)) {
    return code
  }

  return <HastNodes nodes={lowlight.highlight(name, code).children} />
}

function HastNodes({ nodes }: { nodes: HastNodes }) {
  return nodes.map((node, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: the tree is rendered once per text and never reorders
    <HastNode key={index} node={node} />
  ))
}

function HastNode({ node }: { node: HastNode }) {
  if (node.type === "text") {
    return node.value
  }

  if (node.type !== "element") {
    return null
  }

  const className = node.properties.className

  return (
    <span
      className={Array.isArray(className) ? className.join(" ") : undefined}
    >
      <HastNodes nodes={node.children} />
    </span>
  )
}
