import { type Editor } from "@tiptap/react"
import {
  findCompletedMention,
  isMentionNameCharacter,
  type MentionCatalog,
} from "../../mentions/scan"
import { type MentionSuggestion } from "../../mentions/sources"
import {
  insertMentionContent,
  mentionNodeContent,
  replaceTypedMention,
  textBeforeCursor,
} from "../../mentions/suggest/insert"
import { handleSuggestionKey } from "../../mentions/suggest/keys"
import { serializeComposerDocument } from "./codec"
import { type ComposerRefs, type SetComposerSuggestion } from "./types"

/** The listbox's keys first while it is open; then Enter sends, unless
 *  Shift holds it to a line break or an input method is composing. */
export function handleComposerKey({
  event,
  refs,
  setPending,
  setSuggestion,
}: {
  event: KeyboardEvent
  refs: ComposerRefs
  setPending: (pending: boolean) => void
  setSuggestion: SetComposerSuggestion
}) {
  const handled = handleSuggestionKey({
    event,
    onSelect: (item) => selectSuggestion(refs, item, setSuggestion),
    setSuggestion,
    state: refs.latest.current.suggestion,
  })

  if (handled) {
    return true
  }

  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    sendDraft(refs, setPending)
    return true
  }

  return false
}

/** Puts the chosen suggestion where the sigil and its query stand. */
export function selectSuggestion(
  refs: ComposerRefs,
  item: MentionSuggestion,
  setSuggestion: SetComposerSuggestion
) {
  const { editor, suggestion: state } = refs.latest.current

  if (editor === null || state === null || item.disabled) {
    return
  }

  remember(refs, item)
  insertMentionContent(editor, state.range, [
    mentionNodeContent(item, undefined),
  ])
  setSuggestion(null)
}

/** Puts a mention at the caret, from the attach menu. */
export function insertMention(refs: ComposerRefs, item: MentionSuggestion) {
  const { editor } = refs.latest.current

  if (editor === null) {
    return
  }

  const { from, to } = editor.state.selection

  remember(refs, item)
  insertMentionContent(editor, { from, to }, [
    mentionNodeContent(item, undefined),
  ])
}

/** A resource put in is remembered by name for its chip, and the host
 *  is told, so a pane can show it. */
function remember(refs: ComposerRefs, item: MentionSuggestion) {
  if (item.kind === "resource") {
    refs.names.set(item.id, item.label)
    refs.latest.current.args.onMention?.(item.target)
  }
}

/** Typing a boundary after a finished token turns it into a chip. */
export function completeTypedMention({
  catalog,
  from,
  text,
  to,
  view,
}: {
  catalog: MentionCatalog
  from: number
  text: string
  to: number
  view: Editor["view"]
}) {
  if (from !== to || text.length !== 1 || isMentionNameCharacter(text)) {
    return false
  }

  const before = textBeforeCursor(view)
  const match = findCompletedMention(before, catalog)

  if (match === null) {
    return false
  }

  view.dispatch(
    replaceTypedMention({
      content: [mentionNodeContent(match, undefined)],
      from,
      start: from - (before.length - match.start),
      text,
      view,
    }).scrollIntoView()
  )

  return true
}

/** The draft leaves as text with its tokens and the resources they
 *  name; nothing leaves while sending is closed or the draft is blank. A
 *  host that answers with a promise keeps the draft in the field until
 *  the message has landed, and the field clears on success alone: a send
 *  that fails leaves the words where they were for another try, and the
 *  host says why. */
export function sendDraft(
  refs: ComposerRefs,
  setPending: (pending: boolean) => void
) {
  const { args, editor } = refs.latest.current

  if (editor === null || !args.open || refs.sending) {
    return
  }

  const draft = serializeComposerDocument(editor.getJSON())

  if (draft.text === "") {
    return
  }

  const result = args.onSend(draft.text, draft.references)

  if (!(result instanceof Promise)) {
    clearDraft(editor, refs)

    return
  }

  refs.sending = true
  setPending(true)
  result
    .then(
      () => clearDraft(editor, refs),
      () => undefined
    )
    .finally(() => {
      refs.sending = false
      setPending(false)
    })
}

/** The chips leave with the message, not by deletion, so the host hears
 *  of no unmention. */
function clearDraft(editor: Editor, refs: ComposerRefs) {
  refs.mentioned = new Map()
  editor.commands.clearContent(true)
}
