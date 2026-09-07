import { type Editor, useEditor } from "@tiptap/react"
import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { mentionKinds } from "../../mentions/scan"
import {
  createMentionCatalog,
  type MentionSources,
  type MentionSuggestion,
  suggestMentions,
} from "../../mentions/sources"
import { useAutocompleteA11y } from "../../mentions/suggest/a11y"
import { updateSuggestionIndex } from "../../mentions/suggest/keys"
import { getSuggestionState } from "../../mentions/suggest/state"
import { type ResolveReference, targetKey } from "../types"
import { serializeComposerDocument } from "./codec"
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
  const listboxId = useId()
  const [refs] = useState<ComposerRefs>(() => ({
    latest: { current: { args, catalog, editor: null, suggestion: null } },
    mentioned: new Map(),
    names: new Map(),
    sending: false,
  }))
  const {
    editor,
    isEmpty,
    pending,
    setPending,
    setSuggestion,
    suggestion,
    updateSuggestion,
  } = useComposerInstance(refs)

  // The handlers were made once; this is what they read of this render.
  refs.latest.current = { args, catalog, editor, suggestion }

  useAutocompleteA11y({ editor, listboxId, suggestion })
  useResourceSearch(args.sources, suggestion)
  // The host's lists change under an open listbox — a lookup starting,
  // then landing — so the list is read again from what the host has now.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the sources are the reason to read again
  useEffect(() => {
    if (editor !== null && refs.latest.current.suggestion !== null) {
      updateSuggestion(editor)
    }
  }, [args.sources, editor, refs, updateSuggestion])
  useEffect(() => {
    editor?.setEditable(!args.disabled)
  }, [args.disabled, editor])

  return {
    canSend: args.open && !isEmpty && !pending,
    editor,
    insertMention: (item: MentionSuggestion) => insertMention(refs, item),
    isEmpty,
    listboxId,
    /** A send the host is still answering; the draft waits in the field. */
    pending,
    selectSuggestion: (item: MentionSuggestion) =>
      selectSuggestion(refs, item, setSuggestion),
    send: () => sendDraft(refs, setPending),
    setActiveSuggestionIndex: (activeIndex: number) =>
      updateSuggestionIndex(activeIndex, setSuggestion),
    suggestion,
  }
}

/** The editor, made once, and the state its handlers write: whether the
 *  field is empty, whether a send is on its way, and the listbox under
 *  the caret. */
function useComposerInstance(refs: ComposerRefs) {
  const [isEmpty, setIsEmpty] = useState(true)
  const [pending, setPending] = useState(false)
  const [suggestion, setSuggestion] = useState<ComposerSuggestionState | null>(
    null
  )
  const updateSuggestion = useCallback(
    (editor: Editor) =>
      setSuggestion(
        getSuggestionState(editor, {
          activeIndex: refs.latest.current.suggestion?.activeIndex ?? 0,
          kinds: mentionKinds,
          placement: "above",
          suggest: (active) => {
            const sources = refs.latest.current.args.sources
            const suggestions = suggestMentions(active, sources)

            return {
              suggestions,
              ...(active.kind === "resource" &&
              suggestions.length === 0 &&
              sources.searching === true
                ? { empty: "loading" as const }
                : {}),
            }
          },
        })
      ),
    [refs]
  )
  const [options] = useState(() =>
    createEditorOptions({
      refs,
      setIsEmpty,
      setPending,
      setSuggestion,
      updateSuggestion,
    })
  )

  return {
    editor: useEditor(options),
    isEmpty,
    pending,
    setPending,
    setSuggestion,
    updateSuggestion,
    suggestion,
  }
}

/** Tells the host what is being looked for under `+`, so it can narrow
 *  the resources it offers, and that nothing is once the listbox closes. */
function useResourceSearch(
  sources: MentionSources,
  suggestion: ComposerSuggestionState | null
) {
  const query =
    suggestion?.active.kind === "resource" ? suggestion.active.query : null
  const { onSearch } = sources

  useEffect(() => {
    onSearch?.(query)
  }, [onSearch, query])
}

/** A chip's resource by name: the name it was picked under, the host's
 *  list, then the host's resolver. */
function resolveMention(refs: ComposerRefs): ResolveReference {
  return (target) => {
    const { resolve, sources } = refs.latest.current.args
    const name =
      refs.names.get(targetKey(target)) ??
      sources.resources.find(
        (resource) => resource.kind === target.kind && resource.id === target.id
      )?.name

    return name === undefined ? resolve?.(target) : { ...target, name }
  }
}

function createEditorOptions({
  refs,
  setIsEmpty,
  setPending,
  setSuggestion,
  updateSuggestion,
}: {
  refs: ComposerRefs
  setIsEmpty: (isEmpty: boolean) => void
  setPending: (pending: boolean) => void
  setSuggestion: SetComposerSuggestion
  updateSuggestion: (editor: Editor) => void
}): Parameters<typeof useEditor>[0] {
  return {
    editorProps: {
      attributes: {
        "aria-autocomplete": "list",
        "aria-label": "Message",
        "aria-multiline": "true",
        class: contentClassName,
        "data-slot": "input-group-control",
        role: "textbox",
      },
      handleKeyDown: (_view, event) =>
        handleComposerKey({ event, refs, setPending, setSuggestion }),
      handlePaste: (view, event) =>
        insertPastedText(view, event, refs.latest.current.catalog),
      handleTextInput: (view, from, to, text) =>
        completeTypedMention({
          catalog: refs.latest.current.catalog,
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
      noteUnmentions(editor, refs)
    },
    shouldRerenderOnTransaction: false,
  }
}

/** Tells the host of each resource whose chip the change took out of
 *  the text, and remembers what the text holds now. */
function noteUnmentions(editor: Editor, refs: ComposerRefs) {
  const held = new Map(
    serializeComposerDocument(editor.getJSON()).references.map((target) => [
      targetKey(target),
      target,
    ])
  )

  for (const [key, target] of refs.mentioned) {
    if (!held.has(key)) {
      refs.latest.current.args.onUnmention?.(target)
    }
  }

  refs.mentioned = held
}
