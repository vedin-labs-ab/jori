import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction, useEffect, useRef } from "react"
import { type JobMentionCatalog, type JobMentionSources } from "../../../access"
import {
  createJobInstructionDocument,
  jobInstructionKey,
  mergeJobSurfaces,
  serializeJobInstructionDocument,
} from "../document"
import { type InstructionSuggestionState } from "../suggestion/suggest"
import { type InstructionRefs, type JobInstructionsFieldProps } from "../types"

/** The per-render sync pair: latest props into refs, external value into
 *  the editor document. */
export function useInstructionSync(args: {
  additionalSurfaces: JobInstructionsFieldProps["surfaces"]
  catalog: JobMentionCatalog
  editor: Editor | null
  props: JobInstructionsFieldProps
  refs: InstructionRefs
  setIsEmpty: Dispatch<SetStateAction<boolean>>
  sources: JobMentionSources
  suggestion: InstructionSuggestionState | null
  updateSuggestion: (editor: Editor, activeIndex?: number) => void
}) {
  useLatestInstructionRefs(args)
  useExternalInstructionValue({
    ...args,
    contentKey: `${args.props.policyKey}|${args.props.skills.join(",")}`,
  })
}

function useLatestInstructionRefs({
  additionalSurfaces,
  catalog,
  editor,
  props,
  refs,
  sources,
  suggestion,
}: {
  additionalSurfaces: JobInstructionsFieldProps["surfaces"]
  catalog: JobMentionCatalog
  editor: Editor | null
  props: JobInstructionsFieldProps
  refs: InstructionRefs
  sources: JobMentionSources
  suggestion: InstructionSuggestionState | null
}) {
  const renderedWebSearch = useRef(props.webSearch)
  const renderedScope = useRef(props.scope)

  useEffect(() => {
    refs.additionalSurfaces.current = additionalSurfaces
    refs.catalog.current = catalog
    refs.editor.current = editor
    refs.onWebSearchChange.current = props.onWebSearchChange
    refs.onValueChange.current = props.onValueChange
    refs.permissions.current = props.permissions
    refs.scope.current = props.scope
    refs.sources.current = sources
    refs.suggestion.current = suggestion
    if (
      editor !== null &&
      (renderedWebSearch.current !== props.webSearch ||
        renderedScope.current !== props.scope)
    ) {
      editor.view.dispatch(editor.state.tr.setMeta("referenceAccess", true))
    }
    renderedWebSearch.current = props.webSearch
    renderedScope.current = props.scope
  }, [additionalSurfaces, catalog, editor, props, refs, sources, suggestion])
}

function useExternalInstructionValue({
  additionalSurfaces,
  catalog,
  contentKey,
  editor,
  props,
  refs,
  setIsEmpty,
  updateSuggestion,
}: {
  additionalSurfaces: JobInstructionsFieldProps["surfaces"]
  catalog: JobMentionCatalog
  /** Rebuild marker for inputs the serialized value cannot express — the
   *  policy snapshot and the mention catalogs. */
  contentKey: string
  editor: Editor | null
  props: JobInstructionsFieldProps
  refs: InstructionRefs
  setIsEmpty: Dispatch<SetStateAction<boolean>>
  updateSuggestion: (editor: Editor, activeIndex?: number) => void
}) {
  const renderedContentKey = useRef(contentKey)
  const appliedExternalKey = useRef(
    jobInstructionKey({
      description: props.value,
      surfaces: props.surfaces,
    })
  )

  useEffect(() => {
    if (editor === null) {
      return
    }

    const nextValue = { description: props.value, surfaces: props.surfaces }
    const nextKey = jobInstructionKey(nextValue)
    const keyChanged = renderedContentKey.current !== contentKey

    if (!keyChanged && appliedExternalKey.current === nextKey) {
      return
    }

    if (!keyChanged && refs.emittedValueKey.current === nextKey) {
      refs.emittedValueKey.current = undefined
      appliedExternalKey.current = nextKey
      return
    }

    const currentValue = serializeJobInstructionDocument(editor.getJSON())
    currentValue.surfaces = mergeJobSurfaces(
      currentValue.surfaces,
      additionalSurfaces
    )

    if (nextKey !== jobInstructionKey(currentValue) || keyChanged) {
      editor.commands.setContent(
        createJobInstructionDocument({
          catalog,
          description: props.value,
          permissions: props.permissions,
          surfaces: props.surfaces,
        }),
        { emitUpdate: false }
      )
      setIsEmpty(props.value === "")
      updateSuggestion(editor)
    }

    appliedExternalKey.current = nextKey
    renderedContentKey.current = contentKey
  }, [
    additionalSurfaces,
    catalog,
    contentKey,
    editor,
    props,
    refs,
    setIsEmpty,
    updateSuggestion,
  ])
}

export function useInstructionValidationA11y({
  editor,
  error,
  errorId,
}: {
  editor: Editor | null
  error: string | undefined
  errorId: string
}) {
  useEffect(() => {
    const element = editor?.view.dom

    if (element === undefined) {
      return
    }

    if (error === undefined) {
      element.removeAttribute("aria-describedby")
      element.removeAttribute("aria-invalid")
      return
    }

    element.setAttribute("aria-describedby", errorId)
    element.setAttribute("aria-invalid", "true")
  }, [editor, error, errorId])
}
