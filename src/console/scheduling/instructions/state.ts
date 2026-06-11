import {
  type ChangeEvent,
  type KeyboardEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import {
  type ActiveScheduleSurfaceMention,
  findActiveScheduleSurfaceMention,
  getScheduleSurfaceSuggestions,
  normalizeCompletedScheduleSurfaceMentions,
  replaceScheduleSurfaceMention,
  type ScheduleSurfaceProvider,
} from "../surfaces"

type SelectionRange = {
  end: number
  start: number
}

export type InstructionState = ReturnType<typeof useInstructionState>
export type InstructionHandlers = ReturnType<typeof useInstructionHandlers>

export function useInstructionState(value: string) {
  const listboxId = useId()
  const pendingCursorRef = useRef<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selection, setSelection] = useState<SelectionRange>({
    end: 0,
    start: 0,
  })
  const activeMention =
    selection.start === selection.end
      ? findActiveScheduleSurfaceMention(value, selection.start)
      : null
  const suggestions =
    activeMention === null
      ? []
      : getScheduleSurfaceSuggestions(activeMention.query)
  const isAutocompleteOpen = suggestions.length > 0
  const activeSuggestion = suggestions[activeIndex] ?? suggestions[0]

  useLayoutEffect(() => {
    if (pendingCursorRef.current === null) {
      return
    }

    const cursor = pendingCursorRef.current
    pendingCursorRef.current = null
    textareaRef.current?.setSelectionRange(cursor, cursor)
  })

  return {
    activeIndex,
    activeMention,
    activeSuggestion,
    isAutocompleteOpen,
    listboxId,
    pendingCursorRef,
    setActiveIndex,
    setSelection,
    suggestions,
    textareaRef,
  }
}

export function useInstructionHandlers({
  onValueChange,
  state,
  value,
}: {
  onValueChange: (value: string) => void
  state: InstructionState
  value: string
}) {
  function selectSuggestion(
    mention: ActiveScheduleSurfaceMention,
    provider: ScheduleSurfaceProvider
  ) {
    const next = replaceScheduleSurfaceMention(value, mention, provider)

    state.pendingCursorRef.current = next.cursor
    state.setSelection({ end: next.cursor, start: next.cursor })
    onValueChange(next.text)
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const rawValue = event.target.value
    const cursor = getCursorAfterCompletedMentionNormalization(
      rawValue,
      event.target.selectionStart
    )

    state.pendingCursorRef.current = cursor
    state.setSelection({ end: cursor, start: cursor })
    onValueChange(normalizeCompletedScheduleSurfaceMentions(rawValue))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    handleAutocompleteKey({ event, selectSuggestion, state })
  }

  function updateSelection(target: HTMLTextAreaElement) {
    state.setSelection({
      end: target.selectionEnd,
      start: target.selectionStart,
    })
  }

  return { handleChange, handleKeyDown, selectSuggestion, updateSelection }
}

function handleAutocompleteKey({
  event,
  selectSuggestion,
  state,
}: {
  event: KeyboardEvent<HTMLTextAreaElement>
  selectSuggestion: (
    mention: ActiveScheduleSurfaceMention,
    provider: ScheduleSurfaceProvider
  ) => void
  state: InstructionState
}) {
  if (!state.isAutocompleteOpen || state.activeMention === null) {
    return
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault()
    state.setActiveIndex((index) =>
      getNextActiveIndex(index, event.key, state.suggestions.length)
    )
    return
  }

  if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault()

    if (state.activeSuggestion !== undefined) {
      selectSuggestion(state.activeMention, state.activeSuggestion.provider)
    }
    return
  }

  if (event.key === "Escape") {
    event.preventDefault()
    state.setSelection({ end: -1, start: -1 })
  }
}

function getNextActiveIndex(index: number, key: string, length: number) {
  return key === "ArrowDown"
    ? (index + 1) % length
    : (index - 1 + length) % length
}

function getCursorAfterCompletedMentionNormalization(
  value: string,
  cursor: number
) {
  return normalizeCompletedScheduleSurfaceMentions(value.slice(0, cursor))
    .length
}
