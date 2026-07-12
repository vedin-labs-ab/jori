import { Extension, Mark, mergeAttributes } from "@tiptap/core"
import { Lexer, Marked, type marked } from "marked"

export const literalMarkdownMarkName = "literalMarkdown"
const literalMark = [{ type: literalMarkdownMarkName }]

export function createInstructionMarked() {
  return new Marked() as unknown as typeof marked
}

export const LiteralMarkdown = Mark.create({
  name: literalMarkdownMarkName,
  priority: 1000,
  excludes: "_",
  markdownTokenName: "literalInlineHtml",

  markdownTokenizer: {
    name: "literalInlineHtml",
    level: "inline",
    start: () => -1,
    tokenize(source) {
      const raw = Lexer.rules.inline.normal.tag.exec(source)?.[0]

      return raw === undefined
        ? undefined
        : { type: "literalInlineHtml", raw, text: raw }
    },
  },

  parseMarkdown(token, helpers) {
    return helpers.createTextNode(token.raw ?? token.text ?? "", literalMark)
  },

  parseHTML() {
    return [{ tag: "span[data-markdown-literal]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-markdown-literal": "" }),
      0,
    ]
  },

  renderMarkdown(node, helpers) {
    return helpers.renderChildren(node.content ?? [])
  },
})

export const LiteralBlockHtml = Extension.create({
  name: "literalBlockHtml",
  priority: 1000,
  markdownTokenName: "literalBlockHtml",

  markdownTokenizer: {
    name: "literalBlockHtml",
    level: "block",
    start: () => -1,
    tokenize(source) {
      const raw = Lexer.rules.block.normal.html.exec(source)?.[0]

      return raw === undefined
        ? undefined
        : { type: "literalBlockHtml", raw, text: raw }
    },
  },

  parseMarkdown(token, helpers) {
    return helpers.createNode("paragraph", undefined, [
      helpers.createTextNode(token.raw ?? token.text ?? "", literalMark),
    ])
  },
})

export const LiteralMarkdownImage = Extension.create({
  name: "literalMarkdownImage",
  priority: 1000,
  markdownTokenName: "image",

  parseMarkdown(token, helpers) {
    return helpers.createTextNode(literalImage(token), literalMark)
  },
})

function literalImage(token: {
  href?: string
  raw?: string
  text?: string
  title?: string | null
}) {
  if (token.href === undefined) {
    return token.raw ?? token.text ?? ""
  }

  const title = token.title ? ` ${JSON.stringify(token.title)}` : ""
  return `![${token.text ?? ""}](${token.href}${title})`
}
