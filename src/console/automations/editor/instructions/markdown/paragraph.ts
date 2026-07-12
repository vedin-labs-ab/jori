import { Paragraph } from "@tiptap/extension-paragraph"

const emptyParagraphMarkdown = "&nbsp;"

export const SafeParagraph = Paragraph.extend({
  renderMarkdown(node, helpers, context) {
    const content = Array.isArray(node.content) ? node.content : []

    if (content.length === 0) {
      const previousContent = Array.isArray(context?.previousNode?.content)
        ? context.previousNode.content
        : []
      const previousIsEmpty =
        context?.previousNode?.type === "paragraph" &&
        previousContent.length === 0

      return previousIsEmpty ? emptyParagraphMarkdown : ""
    }

    return escapeBlockOpening(helpers.renderChildren(content))
  },
})

function escapeBlockOpening(value: string) {
  if (/^(?:#{1,6}|[-+*>])\s/.test(value)) {
    return `\\${value}`
  }

  if (/^\d{1,9}[.)]\s/.test(value)) {
    return value.replace(
      /^\d{1,9}[.)]/,
      (marker) => `${marker.slice(0, -1)}\\${marker.at(-1)}`
    )
  }

  if (value.startsWith("    ")) {
    return `&#32;${value.slice(1)}`
  }

  if (value.startsWith("\t")) {
    return `&#9;${value.slice(1)}`
  }

  return value
}
