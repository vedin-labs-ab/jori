import { ReactNodeViewRenderer } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { MentionNode } from "../../mentions/node"
import { type ResolveReference } from "../types"
import { ComposerMentionView } from "./node"

export type ComposerMentionOptions = {
  /** How a resource chip finds its name; the host's resolver. */
  getResolve: () => ResolveReference | undefined
}

/** The composer's schema: paragraphs of text with hard breaks and
 *  mention chips, undo, and nothing that formats — a chat message is
 *  plain text. */
export function createComposerExtensions(options: ComposerMentionOptions) {
  return [
    StarterKit.configure({
      blockquote: false,
      bold: false,
      bulletList: false,
      code: false,
      codeBlock: false,
      dropcursor: false,
      gapcursor: false,
      heading: false,
      horizontalRule: false,
      italic: false,
      link: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      strike: false,
      trailingNode: false,
      underline: false,
    }),
    ComposerMention.configure(options),
  ]
}

const ComposerMention = MentionNode.extend<ComposerMentionOptions>({
  addOptions() {
    return { getResolve: () => undefined }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ComposerMentionView)
  },
})
