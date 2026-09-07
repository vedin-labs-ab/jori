import { Document } from "@tiptap/extension-document"
import { HardBreak } from "@tiptap/extension-hard-break"
import { Paragraph } from "@tiptap/extension-paragraph"
import { Text } from "@tiptap/extension-text"
import { UndoRedo } from "@tiptap/extensions"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { MentionNode } from "../../mentions/node"
import { type ResolveReference } from "../types"
import { ComposerMentionView } from "./node"

export type ComposerMentionOptions = {
  /** How a resource chip finds its name; the host's resolver. */
  getResolve: () => ResolveReference | undefined
}

/** The composer's schema: paragraphs of text with hard breaks and
 *  mention chips, undo, and nothing that formats — a chat message is
 *  plain text. Composed by hand rather than cut down from the starter
 *  kit, so the marks, lists, and link parser it would carry never load. */
export function createComposerExtensions(options: ComposerMentionOptions) {
  return [
    Document,
    Paragraph,
    Text,
    HardBreak,
    UndoRedo,
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
