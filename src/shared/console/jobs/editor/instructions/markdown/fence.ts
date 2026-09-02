import { type JSONContent, mergeAttributes, Node } from "@tiptap/core"
import { Code } from "@tiptap/extension-code"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import json from "highlight.js/lib/languages/json"
import { createLowlight } from "lowlight"
import { createCodeBlockShortcuts, createFenceInputRules } from "./block"
import { fencedTextNodeName } from "./schema"

const plainTextFenceAliases = ["", "txt", "text", "plaintext"] as const
const plainTextFenceAliasSet = new Set<string>(plainTextFenceAliases)
export const serializedCodeSpanNodeName = "serializedCodeSpan"

export const FencedText = Node.create({
  name: fencedTextNodeName,
  priority: 110,
  group: "block",
  content: "inline*",
  marks: "",
  code: true,
  defining: true,

  parseHTML() {
    return [{ tag: "pre[data-instruction-text]", preserveWhitespace: "full" }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "pre",
      mergeAttributes(HTMLAttributes, { "data-instruction-text": "" }),
      ["code", 0],
    ]
  },

  markdownTokenName: "code",

  parseMarkdown(token, helpers) {
    if (!isPlainTextFence(token)) {
      return []
    }

    return helpers.createNode(
      fencedTextNodeName,
      undefined,
      textBlockContent(token.text ?? "")
    )
  },

  renderMarkdown(node, helpers) {
    return renderFence("txt", helpers.renderChildren(node.content ?? []))
  },

  addInputRules() {
    return createFenceInputRules({
      language: plainTextFenceLanguageExpression(),
      type: this.type,
    })
  },

  addKeyboardShortcuts() {
    return createCodeBlockShortcuts(this.editor, this.name)
  },
})

export const SafeInlineCode = Code.extend({
  renderMarkdown(node, helpers) {
    const content = helpers.renderChildren(node.content ?? [])

    if (content === "") {
      return ""
    }

    const delimiter = "`".repeat(longestBacktickRun(content) + 1)
    const needsPadding =
      content.startsWith("`") ||
      content.endsWith("`") ||
      (content.startsWith(" ") &&
        content.endsWith(" ") &&
        content.trim() !== "")

    return needsPadding
      ? `${delimiter} ${content} ${delimiter}`
      : `${delimiter}${content}${delimiter}`
  },
})

export const SerializedCodeSpan = Node.create({
  name: serializedCodeSpanNodeName,
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return { content: { default: "" } }
  },

  renderMarkdown(node) {
    return renderCodeSpan(
      typeof node.attrs?.content === "string" ? node.attrs.content : ""
    )
  },
})

const lowlight = createLowlight()
lowlight.register({ json })
lowlight.highlightAuto = (value) => ({
  type: "root",
  children: value === "" ? [] : [{ type: "text", value }],
  data: { relevance: 0 },
})

export const SafeCodeBlock = CodeBlockLowlight.extend({
  addInputRules() {
    return createFenceInputRules({
      getAttributes: (match) => ({ language: match[1] || null }),
      language: "([a-z0-9_-]+)?",
      type: this.type,
    })
  },

  parseMarkdown(token, helpers) {
    const raw = token.raw ?? ""
    const isFence = /^ {0,3}(?:`{3,}|~{3,})/.test(raw)

    if (!isFence && token.codeBlockStyle !== "indented") {
      return []
    }

    return helpers.createNode(
      "codeBlock",
      { language: token.lang || null },
      token.text ? [helpers.createTextNode(token.text)] : []
    )
  },

  renderMarkdown(node, helpers) {
    return renderFence(
      typeof node.attrs?.language === "string" ? node.attrs.language : "",
      helpers.renderChildren(node.content ?? [])
    )
  },
}).configure({ lowlight })

function isPlainTextFence(token: {
  codeBlockStyle?: string
  lang?: string
  raw?: string
}) {
  const raw = token.raw ?? ""
  const isFence = /^ {0,3}(?:`{3,}|~{3,})/.test(raw)
  const language = (token.lang ?? "").trim().toLowerCase()

  return (
    isFence &&
    token.codeBlockStyle !== "indented" &&
    plainTextFenceAliasSet.has(language)
  )
}

function plainTextFenceLanguageExpression() {
  const languages = plainTextFenceAliases.filter(Boolean).join("|")

  return `(?:${languages})?`
}

function textBlockContent(text: string): JSONContent[] {
  const content: JSONContent[] = []
  const lines = text.split("\n")

  for (const [index, line] of lines.entries()) {
    if (index > 0) {
      content.push({ type: "hardBreak" })
    }
    if (line !== "") {
      content.push({ type: "text", text: line })
    }
  }

  return content
}

function renderFence(language: string, content: string) {
  const marker = language.includes("`") ? "~" : "`"
  const fence = marker.repeat(
    Math.max(3, longestMarkerRun(content, marker) + 1)
  )
  const newline = content.endsWith("\n") ? "" : "\n"

  return `${fence}${language}\n${content}${newline}${fence}`
}

function longestBacktickRun(value: string) {
  return longestMarkerRun(value, "`")
}

function longestMarkerRun(value: string, marker: string) {
  const pattern = new RegExp(`${marker}+`, "g")
  return Math.max(
    0,
    ...[...value.matchAll(pattern)].map((match) => match[0].length)
  )
}

function renderCodeSpan(content: string) {
  const delimiter = "`".repeat(Math.max(1, longestBacktickRun(content) + 1))
  const boundarySpaces =
    content.startsWith(" ") &&
    content.endsWith(" ") &&
    content.trim().length > 0
  const padding =
    content.startsWith("`") || content.endsWith("`") || boundarySpaces
      ? " "
      : ""

  return `${delimiter}${padding}${content}${padding}${delimiter}`
}
