import { type ReferenceTarget } from "@contracts/replies/references"
import { type JSONContent } from "@tiptap/core"
import {
  mentionNodeName,
  mentionText,
  readMentionAttributes,
} from "../../mentions/node"
import {
  type MentionCatalog,
  parseResourceMention,
  splitByMentions,
} from "../../mentions/scan"
import { mentionNodeContent } from "../../mentions/suggest/insert"

// A chat message is plain text: lines, and in them the mention tokens the
// run reads. The composer's document is that text with each token as a
// chip, and turns back into it, token for token, when the message leaves.

export type ComposerDraft = {
  /** The resources the text mentions, each once, in the order written. */
  references: ReferenceTarget[]
  text: string
}

/** The text a document sends, trimmed, with each chip as its token, and
 *  the resources those tokens name. */
export function serializeComposerDocument(
  document: JSONContent
): ComposerDraft {
  const references = new Map<string, ReferenceTarget>()
  const text = (document.content ?? [])
    .map((paragraph) => serializeInline(paragraph.content ?? [], references))
    .join("\n")
    .trim()

  return { references: [...references.values()], text }
}

/** One line's inline nodes: its text, with each recognized token as a
 *  mention node. */
export function parseComposerLine(
  line: string,
  catalog: MentionCatalog
): JSONContent[] {
  return splitByMentions(line, catalog).map((segment) =>
    "mention" in segment
      ? mentionNodeContent(segment.mention, undefined)
      : { type: "text", text: segment.text }
  )
}

function serializeInline(
  nodes: JSONContent[],
  references: Map<string, ReferenceTarget>
) {
  return nodes.map((node) => serializeNode(node, references)).join("")
}

function serializeNode(
  node: JSONContent,
  references: Map<string, ReferenceTarget>
) {
  if (node.type === "hardBreak") {
    return "\n"
  }

  if (node.type !== mentionNodeName) {
    return node.text ?? ""
  }

  const mention = readMentionAttributes(node.attrs)

  if (mention === null) {
    return ""
  }

  const target =
    mention.kind === "resource" ? parseResourceMention(mention.id) : null

  if (target !== null) {
    references.set(mention.id, target)
  }

  return mentionText(mention.kind, mention.id)
}
