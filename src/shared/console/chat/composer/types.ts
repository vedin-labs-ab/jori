import { type MessageContext } from "@contracts/replies/answers"
import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction } from "react"
import { type MentionCatalog } from "../../mentions/scan"
import {
  type MentionSources,
  type MentionSuggestion,
} from "../../mentions/sources"
import { type SuggestionState } from "../../mentions/suggest/state"
import { type ResolveReference } from "../types"

export type ComposerSuggestionState = SuggestionState<MentionSuggestion>

export type SetComposerSuggestion = Dispatch<
  SetStateAction<ComposerSuggestionState | null>
>

export type ComposerEditorArgs = {
  disabled: boolean
  /** Takes each resource as it is put in, however it was picked. */
  onMention: ((target: MessageContext) => void) | undefined
  /** Takes each resource as its chip leaves the text, by deletion; a
   *  message sent takes its chips with it without a word. */
  onUnmention: ((target: MessageContext) => void) | undefined
  /** Takes the message; answering with a promise holds the draft in the
   *  field until it settles. */
  onSend: (text: string, references: MessageContext[]) => unknown
  /** Whether a message may leave now. */
  open: boolean
  resolve: ResolveReference | undefined
  sources: MentionSources
}

/** What the editor's handlers read of the latest render, since the
 *  editor is made once: the host's args, the catalog made of its
 *  sources, the editor itself, and the listbox under the caret. */
export type ComposerLatest = {
  args: ComposerEditorArgs
  catalog: MentionCatalog
  editor: Editor | null
  suggestion: ComposerSuggestionState | null
}

/** What the handlers keep across renders. */
export type ComposerRefs = {
  latest: { current: ComposerLatest }
  /** The names of the resources put in as chips, by target key, so a
   *  chip keeps its name after the picker's list has moved on. */
  names: Map<string, string>
  /** The resources the text holds now, by target key, so a deletion is
   *  seen for the chip it took. */
  mentioned: Map<string, MessageContext>
  /** A send the host is still answering, so a second Enter waits. */
  sending: boolean
}
