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
import { type AutomationSurfaceProvider } from "../../../surface"
import {
  createAutomationInstructionDocument,
  serializeAutomationInstructionDocument,
} from "../document"
import {
  insertSurfaceSuggestion,
  replaceCompletedSurfaceMention,
} from "../suggestion/input"
import { handleSuggestionKey, updateSuggestionIndex } from "../suggestion/keys"
import {
  getInstructionSuggestionState,
  type InstructionSuggestionState,
} from "../suggestion/suggest"
import {
  type AutomationInstructionsFieldProps,
  type InstructionRefs,
} from "../types"
import {
  useExternalInstructionValue,
  useInstructionAutocompleteA11y,
  useInstructionValidationA11y,
  useLatestInstructionRefs,
} from "./effects"
import { AutomationSurfaceExtension } from "./extension"

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
        permissions: refs.permissions.current,
        provider,
        setSuggestion,
        state: suggestion,
      }),
    [editor, refs.permissions, suggestion]
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
    permissions: useRef(props.permissions),
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
      getPermissions: () => refs.permissions.current,
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
      replaceCompletedSurfaceMention({
        from,
        permissions: refs.permissions.current,
        text,
        to,
        view,
      }),
  }
}
