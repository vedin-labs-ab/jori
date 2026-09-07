import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction } from "react"
import { handleSuggestionKey } from "@/shared/console/mentions/suggest/keys"
import {
  insertMentionSuggestion,
  replaceCompletedMention,
} from "../suggestion/input"
import { type InstructionSuggestionState } from "../suggestion/suggest"
import { type InstructionRefs } from "../types"
import { instructionContentClassName } from "./style"

// TipTap adds its own class to the element; naming it here too keeps the
// prose scale's selectors stable whether the editor or the brief renders.
const editorContentClassName = `${instructionContentClassName} whitespace-pre-wrap break-words text-foreground selection:bg-informational/20`

export function createEditorProps({
  error,
  errorId,
  id,
  refs,
  setSuggestion,
}: {
  error: string | undefined
  errorId: string
  id: string
  refs: InstructionRefs
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
}) {
  return {
    attributes: {
      "aria-autocomplete": "list",
      ...(error === undefined
        ? {}
        : { "aria-describedby": errorId, "aria-invalid": "true" }),
      "aria-expanded": "false",
      "aria-multiline": "true",
      class: editorContentClassName,
      id,
      role: "textbox",
      spellcheck: "true",
    },
    handleKeyDown: (_view: Editor["view"], event: KeyboardEvent) =>
      handleSuggestionKey({
        event,
        onSelect: (suggestion) =>
          insertMentionSuggestion({
            editor: refs.editor.current,
            onWebAccessChange: refs.onWebSearchChange.current,
            permissions: refs.permissions.current,
            setSuggestion,
            state: refs.suggestion.current,
            suggestion,
          }),
        setSuggestion,
        state: refs.suggestion.current,
      }),
    handleTextInput: (
      view: Editor["view"],
      from: number,
      to: number,
      text: string
    ) =>
      replaceCompletedMention({
        catalog: refs.catalog.current,
        from,
        onWebAccessChange: refs.onWebSearchChange.current,
        permissions: refs.permissions.current,
        sources: refs.sources.current,
        text,
        to,
        view,
      }),
  }
}
