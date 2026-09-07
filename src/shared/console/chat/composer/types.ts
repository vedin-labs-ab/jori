import { type MessageContext } from "@contracts/replies/answers"
import { type Editor } from "@tiptap/react"
import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react"
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
  onSend: (text: string, references: MessageContext[]) => void
  /** Whether a message may leave now. */
  open: boolean
  resolve: ResolveReference | undefined
  sources: MentionSources
}

/** What the editor's handlers read of the latest render, since the
 *  editor is made once. */
export type ComposerRefs = {
  catalog: MutableRefObject<MentionCatalog>
  editor: MutableRefObject<Editor | null>
  /** The names of the resources put in as chips, by `kind:id`, so a chip
   *  keeps its name after the picker's list has moved on. */
  names: Map<string, string>
  /** The resources the text holds now, by `kind:id`, so a deletion is
   *  seen for the chip it took. */
  mentioned: Map<string, MessageContext>
  onMention: MutableRefObject<ComposerEditorArgs["onMention"]>
  onUnmention: MutableRefObject<ComposerEditorArgs["onUnmention"]>
  onSend: MutableRefObject<ComposerEditorArgs["onSend"]>
  open: MutableRefObject<boolean>
  resolve: MutableRefObject<ResolveReference | undefined>
  sources: MutableRefObject<MentionSources>
  suggestion: MutableRefObject<ComposerSuggestionState | null>
}
