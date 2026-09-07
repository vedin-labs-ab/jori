import { type Editor } from "@tiptap/react"
import { useEffect } from "react"
import { type SuggestionState } from "./state"

/** Keeps the editor's autocomplete attributes in step with the listbox:
 *  what it controls and which option is active. The field is a textbox,
 *  not a combobox, so it says nothing of being expanded; the listbox's
 *  presence says that. */
export function useAutocompleteA11y({
  editor,
  listboxId,
  suggestion,
}: {
  editor: Editor | null
  listboxId: string
  suggestion: SuggestionState<unknown> | null
}) {
  useEffect(() => {
    const element = editor?.view.dom

    if (element === undefined) {
      return
    }

    if (suggestion === null) {
      element.removeAttribute("aria-activedescendant")
      element.removeAttribute("aria-controls")
      return
    }

    if (suggestion.suggestions.length === 0) {
      element.removeAttribute("aria-activedescendant")
    } else {
      element.setAttribute(
        "aria-activedescendant",
        `${listboxId}-${suggestion.activeIndex}`
      )
    }
    element.setAttribute("aria-controls", listboxId)
  }, [editor, listboxId, suggestion])
}
