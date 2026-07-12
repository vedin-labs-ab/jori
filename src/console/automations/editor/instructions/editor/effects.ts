import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction, useEffect, useRef } from "react"
import {
  type AutomationMentionCatalog,
  type AutomationMentionSources,
} from "../../../access"
import {
  automationInstructionKey,
  createAutomationInstructionDocument,
  mergeAutomationSurfaces,
  serializeAutomationInstructionDocument,
} from "../document"
import { type InstructionSuggestionState } from "../suggestion/suggest"
import {
  type AutomationInstructionsFieldProps,
  type InstructionRefs,
} from "../types"

/** The per-render sync pair: latest props into refs, external value into
 *  the editor document. */
export function useInstructionSync(args: {
  additionalSurfaces: AutomationInstructionsFieldProps["surfaces"]
  catalog: AutomationMentionCatalog
  editor: Editor | null
  props: AutomationInstructionsFieldProps
  refs: InstructionRefs
  setIsEmpty: Dispatch<SetStateAction<boolean>>
  sources: AutomationMentionSources
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
  additionalSurfaces: AutomationInstructionsFieldProps["surfaces"]
  catalog: AutomationMentionCatalog
  editor: Editor | null
  props: AutomationInstructionsFieldProps
  refs: InstructionRefs
  sources: AutomationMentionSources
  suggestion: InstructionSuggestionState | null
}) {
  const renderedWebSearch = useRef(props.webSearch)

  useEffect(() => {
    refs.additionalSurfaces.current = additionalSurfaces
    refs.catalog.current = catalog
    refs.editor.current = editor
    refs.onBlur.current = props.onBlur
    refs.onWebSearchChange.current = props.onWebSearchChange
    refs.onValueChange.current = props.onValueChange
    refs.permissions.current = props.permissions
    refs.sources.current = sources
    refs.suggestion.current = suggestion
    if (editor !== null && renderedWebSearch.current !== props.webSearch) {
      editor.view.dispatch(editor.state.tr.setMeta("referenceAccess", true))
    }
    renderedWebSearch.current = props.webSearch
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
  additionalSurfaces: AutomationInstructionsFieldProps["surfaces"]
  catalog: AutomationMentionCatalog
  /** Rebuild marker for inputs the serialized value cannot express — the
   *  policy snapshot and the mention catalogs. */
  contentKey: string
  editor: Editor | null
  props: AutomationInstructionsFieldProps
  refs: InstructionRefs
  setIsEmpty: Dispatch<SetStateAction<boolean>>
  updateSuggestion: (editor: Editor, activeIndex?: number) => void
}) {
  const renderedContentKey = useRef(contentKey)
  const appliedExternalKey = useRef(
    automationInstructionKey({
      description: props.value,
      surfaces: props.surfaces,
    })
  )

  useEffect(() => {
    if (editor === null) {
      return
    }

    const nextValue = { description: props.value, surfaces: props.surfaces }
    const nextKey = automationInstructionKey(nextValue)
    const keyChanged = renderedContentKey.current !== contentKey

    if (!keyChanged && appliedExternalKey.current === nextKey) {
      return
    }

    if (!keyChanged && refs.emittedValueKey.current === nextKey) {
      refs.emittedValueKey.current = undefined
      appliedExternalKey.current = nextKey
      return
    }

    const currentValue = serializeAutomationInstructionDocument(
      editor.getJSON()
    )
    currentValue.surfaces = mergeAutomationSurfaces(
      currentValue.surfaces,
      additionalSurfaces
    )

    if (nextKey !== automationInstructionKey(currentValue) || keyChanged) {
      editor.commands.setContent(
        createAutomationInstructionDocument({
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

    if (suggestion.suggestions.length === 0) {
      element.removeAttribute("aria-activedescendant")
    } else {
      element.setAttribute(
        "aria-activedescendant",
        `${listboxId}-${suggestion.activeIndex}`
      )
    }
    element.setAttribute("aria-controls", listboxId)
    element.setAttribute("aria-expanded", "true")
  }, [editor, listboxId, suggestion])
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
