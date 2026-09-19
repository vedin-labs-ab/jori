import { toolSurfaceLabel } from "@contracts/integrations"
import { mergeAttributes, Node } from "@tiptap/core"
import {
  type MentionKind,
  mentionKinds,
  mentionSigils,
  parseResourceMention,
} from "./scan"

export const mentionNodeName = "mention"

export type MentionAttributes = {
  id: string
  kind: MentionKind
}

/** An inline atom standing for one mention. Editors extend it with their
 *  own node view and options; the schema, the attributes, and the token
 *  it serializes to are the same everywhere. */
export const MentionNode = Node.create({
  name: mentionNodeName,
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      kind: {
        default: null,
        parseHTML: (element) =>
          parseMentionKind(element.getAttribute("data-kind")),
        renderHTML: (attributes) => ({
          "data-kind": parseMentionKind(attributes.kind),
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
    return [{ tag: "span[data-mention]" }]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-mention": "" }),
      serializeMentionNode(node.attrs),
    ]
  },

  renderMarkdown(node) {
    return serializeMentionNode(node.attrs)
  },
})

export function parseMentionKind(kind: unknown): MentionKind | null {
  return mentionKinds.find((candidate) => candidate === kind) ?? null
}

/** A node's attributes, when they name a mention. */
export function readMentionAttributes(
  attrs: Record<string, unknown> | undefined
): MentionAttributes | null {
  const kind = parseMentionKind(attrs?.kind)
  const id = attrs?.id

  if (kind === null || typeof id !== "string" || id === "") {
    return null
  }

  return kind === "resource" && parseResourceMention(id) === null
    ? null
    : { id, kind }
}

/** The canonical text a mention serializes to: the sigil and the name
 *  for a named kind, the bracketed kind and id for a resource. */
export function mentionText(kind: MentionKind, id: string) {
  switch (kind) {
    case "integration":
      return `${mentionSigils.integration}${toolSurfaceLabel(id)}`
    case "resource":
      return `${mentionSigils.resource}[${id}]`
    case "skill":
    case "tool":
      return `${mentionSigils[kind]}${id}`
  }
}

function serializeMentionNode(attrs: Record<string, unknown> | undefined) {
  const mention = readMentionAttributes(attrs)

  return mention === null ? "" : mentionText(mention.kind, mention.id)
}
