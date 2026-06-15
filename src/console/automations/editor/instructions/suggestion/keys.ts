import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction } from "react"
import { type AutomationPolicyPermissions } from "../../../access/policy"
import { insertSurfaceSuggestion } from "./input"
import { type InstructionSuggestionState } from "./suggest"

export function handleSuggestionKey({
  editor,
  event,
  permissions,
  setSuggestion,
  state,
}: {
  editor: Editor | null
  event: KeyboardEvent
  permissions: AutomationPolicyPermissions
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
  state: InstructionSuggestionState | null
}) {
  if (state === null) {
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
    insertActiveSuggestion({ editor, permissions, setSuggestion, state })
    return true
  }

  if (event.key === "Escape") {
    event.preventDefault()
    setSuggestion(null)
    return true
  }

  return false
}

export function updateSuggestionIndex(
  activeIndex: number,
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
) {
  setSuggestion((state) => (state === null ? null : { ...state, activeIndex }))
}

function insertActiveSuggestion({
  editor,
  permissions,
  setSuggestion,
  state,
}: {
  editor: Editor | null
  permissions: AutomationPolicyPermissions
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
  state: InstructionSuggestionState
}) {
  const activeSuggestion = state.suggestions[state.activeIndex]

  if (activeSuggestion !== undefined) {
    insertSurfaceSuggestion({
      editor,
      permissions,
      provider: activeSuggestion.provider,
      setSuggestion,
      state,
    })
  }
}

function getNextActiveIndex(index: number, key: string, length: number) {
  return key === "ArrowDown"
    ? (index + 1) % length
    : (index - 1 + length) % length
}
