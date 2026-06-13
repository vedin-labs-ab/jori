import { type Editor, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useId,
  useRef,
  useState,
} from "react"
import { type AutomationSurfaceProvider } from "../../surfaces"
import {
  createAutomationInstructionDocument,
  serializeAutomationInstructionDocument,
} from "./document"
import {
  useExternalInstructionValue,
  useInstructionAutocompleteA11y,
  useInstructionValidationA11y,
  useLatestInstructionRefs,
} from "./effects"
import { AutomationSurfaceExtension } from "./extension"
import {
  insertSurfaceSuggestion,
  replaceCompletedSurfaceMention,
} from "./input"
import { handleSuggestionKey, updateSuggestionIndex } from "./keys"
import {
  getInstructionSuggestionState,
  type InstructionSuggestionState,
} from "./suggest"
import {
  type AutomationInstructionsFieldProps,
  type InstructionRefs,
} from "./types"

export function useAutomationInstructionsEditor(
  props: AutomationInstructionsFieldProps
) {
  const refs = useInstructionRefs(props)
  const listboxId = useId()
  const [isEmpty, setIsEmpty] = useState(props.value === "")
  const [suggestion, setSuggestion] =
    useState<InstructionSuggestionState | null>(null)
  const updateSuggestion = useCallback(
    (editor: Editor, activeIndex = refs.suggestion.current?.activeIndex ?? 0) =>
      setSuggestion(getInstructionSuggestionState(editor, activeIndex)),
    [refs.suggestion]
  )
  const editor = useEditor(
    createEditorOptions({
      props,
      refs,
      setIsEmpty,
      setSuggestion,
      updateSuggestion,
    })
  )

  useLatestInstructionRefs({ editor, props, refs, suggestion })
  useExternalInstructionValue({ editor, props, setIsEmpty, updateSuggestion })
  useInstructionAutocompleteA11y({ editor, listboxId, suggestion })
  useInstructionValidationA11y({
    editor,
    error: props.error,
    errorId: `${props.id}-error`,
  })

  const selectSuggestion = useCallback(
    (provider: AutomationSurfaceProvider) =>
      insertSurfaceSuggestion({
        editor,
        provider,
        readScope: props.readScope,
        setSuggestion,
        state: suggestion,
      }),
    [editor, props.readScope, suggestion]
  )

  return {
    editor,
    isEmpty,
    listboxId,
    selectSuggestion,
    setActiveSuggestionIndex: (activeIndex: number) =>
      updateSuggestionIndex(activeIndex, setSuggestion),
    suggestion,
  }
}

export const editorContentClassName =
  "whitespace-pre-wrap break-words text-foreground selection:bg-informational/20"

function useInstructionRefs(props: AutomationInstructionsFieldProps) {
  return {
    editor: useRef<Editor | null>(null),
    onBlur: useRef(props.onBlur),
    onValueChange: useRef(props.onValueChange),
    readScope: useRef(props.readScope),
    suggestion: useRef<InstructionSuggestionState | null>(null),
  }
}

function createEditorOptions({
  props,
  refs,
  setIsEmpty,
  setSuggestion,
  updateSuggestion,
}: {
  props: AutomationInstructionsFieldProps
  refs: InstructionRefs
  setIsEmpty: Dispatch<SetStateAction<boolean>>
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
  updateSuggestion: (editor: Editor, activeIndex?: number) => void
}): Parameters<typeof useEditor>[0] {
  return {
    content: createAutomationInstructionDocument({
      description: props.value,
      permissions: props.permissions,
      readScope: props.readScope,
      surfaces: props.surfaces,
    }),
    editorProps: createEditorProps({
      error: props.error,
      errorId: `${props.id}-error`,
      id: props.id,
      refs,
      setSuggestion,
    }),
    extensions: createExtensions(refs),
    immediatelyRender: false,
    onBlur: () => refs.onBlur.current(),
    onSelectionUpdate: ({ editor }) => updateSuggestion(editor),
    onUpdate: ({ editor }) => {
      const nextValue = serializeAutomationInstructionDocument(editor.getJSON())

      setIsEmpty(nextValue.description === "")
      refs.onValueChange.current(nextValue)
      updateSuggestion(editor)
    },
  }
}

function createExtensions(refs: InstructionRefs) {
  return [
    starterKitExtension,
    AutomationSurfaceExtension.configure({
      getReadScope: () => refs.readScope.current,
    }),
  ]
}

const starterKitExtension = StarterKit.configure({
  blockquote: false,
  bold: false,
  bulletList: false,
  code: false,
  codeBlock: false,
  dropcursor: false,
  gapcursor: false,
  heading: false,
  horizontalRule: false,
  italic: false,
  listItem: false,
  orderedList: false,
  strike: false,
})

function createEditorProps({
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
        readScope: refs.readScope.current,
        setSuggestion,
        state: refs.suggestion.current,
      }),
    handleTextInput: (
      view: Editor["view"],
      from: number,
      to: number,
      text: string
    ) =>
      replaceCompletedSurfaceMention({
        from,
        readScope: refs.readScope.current,
        text,
        to,
        view,
      }),
  }
}
