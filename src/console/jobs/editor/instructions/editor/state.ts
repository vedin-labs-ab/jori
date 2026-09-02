import { type Editor, useEditor } from "@tiptap/react"
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react"
import {
  createJobMentionCatalog,
  isJobSurfaceAllowedForScope,
  type JobMentionCatalog,
  type JobMentionSources,
  type JobMentionSuggestion,
  jobSurfaceIntegrations,
} from "@/shared/console/jobs/access"
import {
  createJobInstructionDocument,
  jobInstructionKey,
  mergeJobSurfaces,
  serializeJobInstructionDocument,
} from "../document"
import { insertMentionSuggestion } from "../suggestion/input"
import { updateSuggestionIndex } from "../suggestion/keys"
import {
  getInstructionSuggestionState,
  type InstructionSuggestionState,
} from "../suggestion/suggest"
import { type InstructionRefs, type JobInstructionsFieldProps } from "../types"
import {
  useInstructionAutocompleteA11y,
  useInstructionSync,
  useInstructionValidationA11y,
} from "./effects"
import { createInstructionExtensions } from "./extension"
import { createEditorProps } from "./props"

export function useJobInstructionsEditor(props: JobInstructionsFieldProps) {
  const { catalog, sources } = useMentionSources(props)
  const refs = useInstructionRefs(props, catalog, sources)
  const listboxId = useId()
  const [isEmpty, setIsEmpty] = useState(props.value === "")
  const [suggestion, setSuggestion] =
    useState<InstructionSuggestionState | null>(null)
  const updateSuggestion = useUpdateSuggestion(refs, setSuggestion)
  const editor = useConfiguredInstructionEditor({
    catalog,
    props,
    refs,
    setIsEmpty,
    setSuggestion,
    updateSuggestion,
  })

  useInstructionSync({
    catalog,
    additionalSurfaces: props.additionalSurfaces,
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
    (item: JobMentionSuggestion) =>
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

function useConfiguredInstructionEditor(
  args: Parameters<typeof createEditorOptions>[0]
) {
  const [editorOptions] = useState(() => createEditorOptions(args))

  return useEditor(editorOptions)
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

function useMentionSources(props: JobInstructionsFieldProps) {
  const { availableIntegrations, permissions } = useScopeMentionSources(props)
  const catalog = useMemo(
    () =>
      createJobMentionCatalog({
        skills: props.skills,
        tools: Array.isArray(props.permissions)
          ? props.permissions.map((permission) => permission.tool)
          : [],
      }),
    [props.permissions, props.skills]
  )
  const sources = useMemo(
    () => ({
      integrations: availableIntegrations,
      permissions,
      skills: props.skills,
      surfaces: props.surfaces,
      webSearch: props.webSearch,
    }),
    [
      availableIntegrations,
      permissions,
      props.skills,
      props.surfaces,
      props.webSearch,
    ]
  )
  return { catalog, sources }
}

function useScopeMentionSources(props: JobInstructionsFieldProps) {
  const availableIntegrations = useMemo(
    () =>
      props.scope === "personal"
        ? undefined
        : jobSurfaceIntegrations
            .map((surface) => surface.integration)
            .filter((integration) =>
              isJobSurfaceAllowedForScope(props.scope, integration)
            ),
    [props.scope]
  )
  const permissions = useMemo(
    () =>
      !Array.isArray(props.permissions) || props.scope === "personal"
        ? props.permissions
        : props.permissions.filter(
            (permission) =>
              permission.surface === "jori" ||
              isJobSurfaceAllowedForScope(props.scope, permission.surface)
          ),
    [props.permissions, props.scope]
  )
  return { availableIntegrations, permissions }
}

function useInstructionRefs(
  props: JobInstructionsFieldProps,
  catalog: JobMentionCatalog,
  sources: JobMentionSources
): InstructionRefs {
  const [refs] = useState<InstructionRefs>(() => ({
    additionalSurfaces: { current: props.additionalSurfaces },
    catalog: { current: catalog },
    editor: { current: null },
    emittedValueKey: { current: undefined },
    onWebSearchChange: { current: props.onWebSearchChange },
    onValueChange: { current: props.onValueChange },
    permissions: { current: props.permissions },
    scope: { current: props.scope },
    sources: { current: sources },
    suggestion: { current: null },
    organizationId: { current: props.organizationId },
  }))

  return refs
}

function createEditorOptions({
  catalog,
  props,
  refs,
  setIsEmpty,
  setSuggestion,
  updateSuggestion,
}: {
  catalog: JobMentionCatalog
  props: JobInstructionsFieldProps
  refs: InstructionRefs
  setIsEmpty: Dispatch<SetStateAction<boolean>>
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
  updateSuggestion: (editor: Editor, activeIndex?: number) => void
}): Parameters<typeof useEditor>[0] {
  return {
    content: createJobInstructionDocument({
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
    onSelectionUpdate: ({ editor }) => updateSuggestion(editor),
    onUpdate: ({ editor }) => {
      const nextValue = serializeJobInstructionDocument(editor.getJSON())
      nextValue.surfaces = mergeJobSurfaces(
        nextValue.surfaces,
        refs.additionalSurfaces.current
      )
      refs.emittedValueKey.current = jobInstructionKey(nextValue)

      setIsEmpty(nextValue.description === "")
      refs.onValueChange.current(nextValue)
      updateSuggestion(editor)
    },
    shouldRerenderOnTransaction: false,
  }
}
