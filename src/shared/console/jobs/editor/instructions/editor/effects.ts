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

/** Keep callback refs current before applying external document changes. */
export function useInstructionSync(args: {
  catalog: JobMentionCatalog
  editor: Editor | null
  props: JobInstructionsFieldProps
  refs: InstructionRefs
  setIsEmpty: Dispatch<SetStateAction<boolean>>
  sources: JobMentionSources
  suggestion: InstructionSuggestionState | null
  updateSuggestion: (editor: Editor, activeIndex?: number) => void
}) {
  const { catalog, editor, props, refs, sources, suggestion } = args
  const renderedWebSearch = useRef(props.webSearch)
  const renderedScope = useRef(props.scope)

  useEffect(() => {
    refs.additionalSurfaces.current = props.additionalSurfaces
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
  }, [catalog, editor, props, refs, sources, suggestion])

  useExternalInstructionValue(args)
}

function useExternalInstructionValue({
  catalog,
  editor,
  props,
  refs,
  setIsEmpty,
  updateSuggestion,
}: Parameters<typeof useInstructionSync>[0]) {
  // Policy and catalog changes can rebuild markers without changing the value.
  const contentKey = `${props.policyKey}|${props.skills.join(",")}`
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
      props.additionalSurfaces
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
  }, [catalog, contentKey, editor, props, refs, setIsEmpty, updateSuggestion])
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
