import { mergeAttributes, Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { automationMentionText } from "../../../access"
import { AutomationReferenceNodeView } from "../access/reference"
import {
  automationReferenceNodeName,
  parseAutomationReferenceKind,
} from "../document"

/** A skill or tool mention: a plain atomic pill, unlike integration
 *  surfaces it carries no access state — it only names the capability. */
export const AutomationReferenceExtension = Node.create({
  name: automationReferenceNodeName,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      kind: {
        default: null,
        parseHTML: (element) =>
          parseAutomationReferenceKind(element.getAttribute("data-kind")),
        renderHTML: (attributes) => ({
          "data-kind": parseAutomationReferenceKind(attributes.kind),
        }),
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": typeof attributes.id === "string" ? attributes.id : null,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-automation-reference]" }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const kind = parseAutomationReferenceKind(node.attrs.kind)

    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-automation-reference": "" }),
      kind === null || typeof node.attrs.id !== "string"
        ? ""
        : automationMentionText(kind, node.attrs.id),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AutomationReferenceNodeView)
  },
})
