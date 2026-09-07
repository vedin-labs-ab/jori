import { type Editor, useEditor } from "@tiptap/react"
import { useCallback, useEffect, useId, useMemo, useState } from "react"
import {
  type MentionCatalog,
  mentionKinds,
  resourceMentionId,
} from "../../mentions/scan"
import {
  createMentionCatalog,
  type MentionSources,
  type MentionSuggestion,
  suggestMentions,
} from "../../mentions/sources"
import { useAutocompleteA11y } from "../../mentions/suggest/a11y"
import { updateSuggestionIndex } from "../../mentions/suggest/keys"
import { getSuggestionState } from "../../mentions/suggest/state"
import { type ResolveReference } from "../types"
import { createComposerExtensions } from "./extensions"
import {
  completeTypedMention,
  handleComposerKey,
  insertMention,
  selectSuggestion,
  sendDraft,
} from "./input"
import { insertPastedText } from "./paste"
import {
  type ComposerEditorArgs,
  type ComposerRefs,
  type ComposerSuggestionState,
  type SetComposerSuggestion,
} from "./types"

const contentClassName =
  "max-h-48 min-h-9 w-full overflow-y-auto whitespace-pre-wrap break-words px-2 py-2 text-foreground text-sm outline-none [overflow-wrap:anywhere] aria-disabled:cursor-not-allowed aria-disabled:opacity-50"

/** The composer's editor: plain text with mention chips, a listbox under
 *  a sigil, Enter to send and Shift+Enter for a line, paste as text. */
export function useComposerEditor(args: ComposerEditorArgs) {
  const catalog = useMemo(
    () => createMentionCatalog(args.sources),
    [args.sources]
  )
  const refs = useComposerRefs(args, catalog)
  const listboxId = useId()
  const [isEmpty, setIsEmpty] = useState(true)
  const [suggestion, setSuggestion] = useState<ComposerSuggestionState | null>(
    null
  )
  const updateSuggestion = useCallback(
    (editor: Editor) =>
      setSuggestion(
        getSuggestionState(editor, {
          activeIndex: refs.suggestion.current?.activeIndex ?? 0,
          kinds: mentionKinds,
          suggest: (active) => ({
            suggestions: suggestMentions(active, refs.sources.current),
          }),
        })
      ),
    [refs]
  )
  const [options] = useState(() =>
    createEditorOptions({ refs, setIsEmpty, setSuggestion, updateSuggestion })
  )
  const editor = useEditor(options)

  useLatestRefs(refs, args, catalog, editor, suggestion)
  useAutocompleteA11y({ editor, listboxId, suggestion })
  useResourceSearch(args.sources, suggestion)
  useEffect(() => {
    editor?.setEditable(!args.disabled)
  }, [args.disabled, editor])

  return {
    canSend: args.open && !isEmpty,
    editor,
    insertMention: (item: MentionSuggestion) =>
      insertMention(editor, refs, item),
    isEmpty,
    listboxId,
    selectSuggestion: (item: MentionSuggestion) =>
      selectSuggestion(editor, refs, suggestion, item, setSuggestion),
    send: () => sendDraft(editor, refs),
    setActiveSuggestionIndex: (activeIndex: number) =>
      updateSuggestionIndex(activeIndex, setSuggestion),
    suggestion,
  }
}

function useComposerRefs(
  args: ComposerEditorArgs,
  catalog: MentionCatalog
): ComposerRefs {
  const [refs] = useState<ComposerRefs>(() => ({
    catalog: { current: catalog },
    editor: { current: null },
    names: new Map(),
    onSend: { current: args.onSend },
    open: { current: args.open },
    resolve: { current: args.resolve },
    sources: { current: args.sources },
    suggestion: { current: null },
  }))

  return refs
}

function useLatestRefs(
  refs: ComposerRefs,
  args: ComposerEditorArgs,
  catalog: MentionCatalog,
  editor: Editor | null,
  suggestion: ComposerSuggestionState | null
) {
  useEffect(() => {
    refs.catalog.current = catalog
    refs.editor.current = editor
    refs.onSend.current = args.onSend
    refs.open.current = args.open
    refs.resolve.current = args.resolve
    refs.sources.current = args.sources
    refs.suggestion.current = suggestion
  }, [args, catalog, editor, refs, suggestion])
}

/** Tells the host what is being looked for under `+`, so it can narrow
 *  the resources it offers. */
function useResourceSearch(
  sources: MentionSources,
  suggestion: ComposerSuggestionState | null
) {
  const query =
    suggestion?.active.kind === "resource" ? suggestion.active.query : null
  const { onSearch } = sources

  useEffect(() => {
    if (query !== null) {
      onSearch?.(query)
    }
  }, [onSearch, query])
}

/** A chip's resource by name: the name it was picked under, the host's
 *  list, then the host's resolver. */
function resolveMention(refs: ComposerRefs): ResolveReference {
  return (target) => {
    const name =
      refs.names.get(resourceMentionId(target)) ??
      refs.sources.current.resources.find(
        (resource) => resource.kind === target.kind && resource.id === target.id
      )?.name

    return name === undefined
      ? refs.resolve.current?.(target)
      : { ...target, name }
  }
}

function createEditorOptions({
  refs,
  setIsEmpty,
  setSuggestion,
  updateSuggestion,
}: {
  refs: ComposerRefs
  setIsEmpty: (isEmpty: boolean) => void
  setSuggestion: SetComposerSuggestion
  updateSuggestion: (editor: Editor) => void
}): Parameters<typeof useEditor>[0] {
  return {
    editorProps: {
      attributes: {
        "aria-autocomplete": "list",
        "aria-expanded": "false",
        "aria-label": "Message",
        "aria-multiline": "true",
        class: contentClassName,
        "data-slot": "input-group-control",
        role: "textbox",
      },
      handleKeyDown: (_view, event) =>
        handleComposerKey({ event, refs, setSuggestion }),
      handlePaste: (view, event) =>
        insertPastedText(view, event, refs.catalog.current),
      handleTextInput: (view, from, to, text) =>
        completeTypedMention({
          catalog: refs.catalog.current,
          from,
          text,
          to,
          view,
        }),
    },
    extensions: createComposerExtensions({
      getResolve: () => resolveMention(refs),
    }),
    immediatelyRender: false,
    onSelectionUpdate: ({ editor }) => updateSuggestion(editor),
    onUpdate: ({ editor }) => {
      setIsEmpty(editor.isEmpty)
      updateSuggestion(editor)
    },
    shouldRerenderOnTransaction: false,
  }
}
