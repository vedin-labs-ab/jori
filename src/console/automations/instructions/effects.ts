import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction, useEffect } from "react"
import {
  automationInstructionKey,
  createAutomationInstructionDocument,
  serializeAutomationInstructionDocument,
} from "./document"
import { type InstructionSuggestionState } from "./suggest"
import {
  type AutomationInstructionsFieldProps,
  type InstructionRefs,
} from "./types"

export function useLatestInstructionRefs({
  editor,
  props,
  refs,
  suggestion,
}: {
  editor: Editor | null
  props: AutomationInstructionsFieldProps
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
  props: AutomationInstructionsFieldProps
  setIsEmpty: Dispatch<SetStateAction<boolean>>
  updateSuggestion: (editor: Editor, activeIndex?: number) => void
}) {
  useEffect(() => {
    if (editor === null) {
      return
    }

    const nextValue = { description: props.value, surfaces: props.surfaces }
    const currentValue = serializeAutomationInstructionDocument(
      editor.getJSON()
    )

    if (
      automationInstructionKey(nextValue) !==
      automationInstructionKey(currentValue)
    ) {
      editor.commands.setContent(
        createAutomationInstructionDocument({
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
