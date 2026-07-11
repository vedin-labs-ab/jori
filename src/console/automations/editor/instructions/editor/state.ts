import { type Editor, useEditor } from "@tiptap/react"
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  type AutomationMentionCatalog,
  type AutomationMentionSources,
  type AutomationMentionSuggestion,
  createAutomationMentionCatalog,
} from "../../../access"
import {
  createAutomationInstructionDocument,
  serializeAutomationInstructionDocument,
} from "../document"
import {
  insertMentionSuggestion,
  replaceCompletedMention,
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
  useInstructionAutocompleteA11y,
  useInstructionSync,
  useInstructionValidationA11y,
} from "./effects"
import { createInstructionExtensions } from "./extension"

export function useAutomationInstructionsEditor(
  props: AutomationInstructionsFieldProps
) {
  const { catalog, sources } = useMentionSources(props)
  const refs = useInstructionRefs(props, catalog, sources)
  const listboxId = useId()
  const [isEmpty, setIsEmpty] = useState(props.value === "")
  const [suggestion, setSuggestion] =
    useState<InstructionSuggestionState | null>(null)
  const updateSuggestion = useUpdateSuggestion(refs, setSuggestion)
  const editor = useEditor(
    createEditorOptions({
      catalog,
      props,
      refs,
      setIsEmpty,
      setSuggestion,
      updateSuggestion,
    })
  )

  useInstructionSync({
    catalog,
    editor,
    props,
    refs,
    setIsEmpty,
    sources,
    suggestion,
    updateSuggestion,
  })
  useInstructionAutocompleteA11y({ editor, listboxId, suggestion })
  useInstructionValidationA11y({
    editor,
    error: props.error,
    errorId: `${props.id}-error`,
  })

  const selectSuggestion = useCallback(
    (item: AutomationMentionSuggestion) =>
      insertMentionSuggestion({
        editor,
        permissions: refs.permissions.current,
        suggestion: item,
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

const editorContentClassName =
  "whitespace-pre-wrap break-words text-foreground selection:bg-informational/20"

function useUpdateSuggestion(
  refs: InstructionRefs,
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
) {
  return useCallback(
    (editor: Editor, activeIndex = refs.suggestion.current?.activeIndex ?? 0) =>
      setSuggestion(
        getInstructionSuggestionState(editor, refs.sources.current, activeIndex)
      ),
    [refs, setSuggestion]
  )
}

function useMentionSources(props: AutomationInstructionsFieldProps) {
  const catalog = useMemo(
    () =>
      createAutomationMentionCatalog({
        skills: props.skills,
        tools: Array.isArray(props.permissions)
          ? props.permissions.map((permission) => permission.tool)
          : [],
      }),
    [props.skills, props.permissions]
  )
  const sources = useMemo(
    () => ({ permissions: props.permissions, skills: props.skills }),
    [props.permissions, props.skills]
  )

  return { catalog, sources }
}

function useInstructionRefs(
  props: AutomationInstructionsFieldProps,
  catalog: AutomationMentionCatalog,
  sources: AutomationMentionSources
): InstructionRefs {
  return {
    catalog: useRef(catalog),
    editor: useRef<Editor | null>(null),
    onBlur: useRef(props.onBlur),
    onValueChange: useRef(props.onValueChange),
    permissions: useRef(props.permissions),
    sources: useRef(sources),
    suggestion: useRef<InstructionSuggestionState | null>(null),
  }
}

function createEditorOptions({
  catalog,
  props,
  refs,
  setIsEmpty,
  setSuggestion,
  updateSuggestion,
}: {
  catalog: AutomationMentionCatalog
  props: AutomationInstructionsFieldProps
  refs: InstructionRefs
  setIsEmpty: Dispatch<SetStateAction<boolean>>
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
  updateSuggestion: (editor: Editor, activeIndex?: number) => void
}): Parameters<typeof useEditor>[0] {
  return {
    content: createAutomationInstructionDocument({
      catalog,
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
    extensions: createInstructionExtensions(refs),
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
      replaceCompletedMention({
        catalog: refs.catalog.current,
        from,
        permissions: refs.permissions.current,
        text,
        to,
        view,
      }),
  }
}
