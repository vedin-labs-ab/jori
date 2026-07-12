import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction } from "react"
import { type AutomationPolicyPermissions } from "../../../access/policy"
import { insertMentionSuggestion } from "./input"
import { type InstructionSuggestionState } from "./suggest"

export function handleSuggestionKey({
  editor,
  event,
  onWebAccessChange,
  permissions,
  setSuggestion,
  state,
}: {
  editor: Editor | null
  event: KeyboardEvent
  onWebAccessChange: (enabled: boolean) => void
  permissions: AutomationPolicyPermissions
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
  state: InstructionSuggestionState | null
}) {
  if (state === null) {
    return false
  }

  if (state.suggestions.length === 0) {
    if (event.key === "Escape") {
      event.preventDefault()
      setSuggestion(null)
      return true
    }

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
    insertActiveSuggestion({
      editor,
      onWebAccessChange,
      permissions,
      setSuggestion,
      state,
    })
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
  onWebAccessChange,
  permissions,
  setSuggestion,
  state,
}: {
  editor: Editor | null
  onWebAccessChange: (enabled: boolean) => void
  permissions: AutomationPolicyPermissions
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
  state: InstructionSuggestionState
}) {
  const activeSuggestion = state.suggestions[state.activeIndex]

  if (activeSuggestion !== undefined) {
    insertMentionSuggestion({
      editor,
      onWebAccessChange,
      permissions,
      suggestion: activeSuggestion,
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
