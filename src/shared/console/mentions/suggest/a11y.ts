import { type Editor } from "@tiptap/react"
import { useEffect } from "react"
import { type SuggestionState } from "./state"

/** Keeps the editor's combobox attributes in step with the listbox: what
 *  it controls, whether it is expanded, and which option is active. */
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
      element.setAttribute("aria-expanded", "false")
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
    element.setAttribute("aria-expanded", "true")
  }, [editor, listboxId, suggestion])
}
