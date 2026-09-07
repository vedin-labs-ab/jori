import { type Dispatch, type SetStateAction } from "react"
import { type SuggestionState } from "./state"

type SetSuggestion<Suggestion> = Dispatch<
  SetStateAction<SuggestionState<Suggestion> | null>
>

/** The keys the open listbox answers to: arrows move the active row,
 *  Enter and Tab take it, Escape closes. Anything else falls through to
 *  the editor, and so does everything while the listbox is closed. */
export function handleSuggestionKey<Suggestion>({
  event,
  onSelect,
  setSuggestion,
  state,
}: {
  event: KeyboardEvent
  onSelect: (suggestion: Suggestion) => void
  setSuggestion: SetSuggestion<Suggestion>
  state: SuggestionState<Suggestion> | null
}) {
  if (state === null) {
    return false
  }

  if (event.key === "Escape") {
    event.preventDefault()
    setSuggestion(null)
    return true
  }

  if (state.suggestions.length === 0) {
    return false
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault()
    updateSuggestionIndex(
      getNextActiveIndex(
        state.activeIndex,
        event.key,
        state.suggestions.length
      ),
      setSuggestion
    )
    return true
  }

  if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault()

    const activeSuggestion = state.suggestions[state.activeIndex]

    if (activeSuggestion !== undefined) {
      onSelect(activeSuggestion)
    }

    return true
  }

  return false
}

export function updateSuggestionIndex<Suggestion>(
  activeIndex: number,
  setSuggestion: SetSuggestion<Suggestion>
) {
  setSuggestion((state) => (state === null ? null : { ...state, activeIndex }))
}

function getNextActiveIndex(index: number, key: string, length: number) {
  return key === "ArrowDown"
    ? (index + 1) % length
    : (index - 1 + length) % length
}
