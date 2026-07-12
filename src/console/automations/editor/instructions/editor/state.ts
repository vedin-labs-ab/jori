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
  automationInstructionKey,
  createAutomationInstructionDocument,
  mergeAutomationSurfaces,
  readAdditionalAutomationSurfaces,
  serializeAutomationInstructionDocument,
} from "../document"
import { insertMentionSuggestion } from "../suggestion/input"
import { updateSuggestionIndex } from "../suggestion/keys"
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
import { createEditorProps } from "./props"

export function useAutomationInstructionsEditor(
  props: AutomationInstructionsFieldProps
) {
  const { additionalSurfaces, catalog, sources } = useMentionSources(props)
  const refs = useInstructionRefs(props, catalog, sources, additionalSurfaces)
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
    additionalSurfaces,
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
        onWebAccessChange: refs.onWebSearchChange.current,
        permissions: refs.permissions.current,
        suggestion: item,
        setSuggestion,
        state: suggestion,
      }),
    [editor, refs.onWebSearchChange, refs.permissions, suggestion]
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
    () => ({
      permissions: props.permissions,
      skills: props.skills,
      surfaces: props.surfaces,
      webSearch: props.webSearch,
    }),
    [props.permissions, props.skills, props.surfaces, props.webSearch]
  )
  const additionalSurfaces = useMemo(
    () =>
      readAdditionalAutomationSurfaces({
        catalog,
        description: props.value,
        permissions: props.permissions,
        surfaces: props.surfaces,
      }),
    [catalog, props.permissions, props.surfaces, props.value]
  )

  return { additionalSurfaces, catalog, sources }
}

function useInstructionRefs(
  props: AutomationInstructionsFieldProps,
  catalog: AutomationMentionCatalog,
  sources: AutomationMentionSources,
  additionalSurfaces: AutomationInstructionsFieldProps["surfaces"]
): InstructionRefs {
  return {
    additionalSurfaces: useRef(additionalSurfaces),
    catalog: useRef(catalog),
    editor: useRef<Editor | null>(null),
    emittedValueKey: useRef<string | undefined>(undefined),
    onBlur: useRef(props.onBlur),
    onWebSearchChange: useRef(props.onWebSearchChange),
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
      nextValue.surfaces = mergeAutomationSurfaces(
        nextValue.surfaces,
        refs.additionalSurfaces.current
      )
      refs.emittedValueKey.current = automationInstructionKey(nextValue)

      setIsEmpty(nextValue.description === "")
      refs.onValueChange.current(nextValue)
      updateSuggestion(editor)
    },
    shouldRerenderOnTransaction: false,
  }
}
