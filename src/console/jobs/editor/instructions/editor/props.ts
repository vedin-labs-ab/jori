import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction } from "react"
import { replaceCompletedMention } from "../suggestion/input"
import { handleSuggestionKey } from "../suggestion/keys"
import { type InstructionSuggestionState } from "../suggestion/suggest"
import { type InstructionRefs } from "../types"

const editorContentClassName =
  "whitespace-pre-wrap break-words text-foreground selection:bg-informational/20"

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
        editor: refs.editor.current,
        event,
        onWebAccessChange: refs.onWebSearchChange.current,
        permissions: refs.permissions.current,
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
