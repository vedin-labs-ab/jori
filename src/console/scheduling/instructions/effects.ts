import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction, useEffect } from "react"
import {
  createScheduleInstructionDocument,
  scheduleInstructionKey,
  serializeScheduleInstructionDocument,
} from "./document"
import { type InstructionSuggestionState } from "./suggest"
import {
  type InstructionRefs,
  type ScheduleInstructionsFieldProps,
} from "./types"

export function useLatestInstructionRefs({
  editor,
  props,
  refs,
  suggestion,
}: {
  editor: Editor | null
  props: ScheduleInstructionsFieldProps
  refs: InstructionRefs
  suggestion: InstructionSuggestionState | null
}) {
  useEffect(() => {
    refs.editor.current = editor
    refs.onBlur.current = props.onBlur
    refs.onValueChange.current = props.onValueChange
    refs.readScope.current = props.readScope
    refs.suggestion.current = suggestion
  }, [editor, props, refs, suggestion])
}

export function useExternalInstructionValue({
  editor,
  props,
  setIsEmpty,
  updateSuggestion,
}: {
  editor: Editor | null
  props: ScheduleInstructionsFieldProps
  setIsEmpty: Dispatch<SetStateAction<boolean>>
  updateSuggestion: (editor: Editor, activeIndex?: number) => void
}) {
  useEffect(() => {
    if (editor === null) {
      return
    }

    const nextValue = { description: props.value, surfaces: props.surfaces }
    const currentValue = serializeScheduleInstructionDocument(editor.getJSON())

    if (
      scheduleInstructionKey(nextValue) !== scheduleInstructionKey(currentValue)
    ) {
      editor.commands.setContent(
        createScheduleInstructionDocument({
          description: props.value,
          readScope: props.readScope,
          surfaces: props.surfaces,
        }),
        { emitUpdate: false }
      )
      setIsEmpty(props.value === "")
      updateSuggestion(editor)
    }
  }, [editor, props, setIsEmpty, updateSuggestion])
}

export function useInstructionAutocompleteA11y({
  editor,
  listboxId,
  suggestion,
}: {
  editor: Editor | null
  listboxId: string
  suggestion: InstructionSuggestionState | null
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

    element.setAttribute(
      "aria-activedescendant",
      `${listboxId}-${suggestion.activeIndex}`
    )
    element.setAttribute("aria-controls", listboxId)
    element.setAttribute("aria-expanded", "true")
  }, [editor, listboxId, suggestion])
}
