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
import {
  type ComposerRefs,
  type ComposerSuggestionState,
  type SetComposerSuggestion,
} from "./types"

/** The listbox's keys first while it is open; then Enter sends, unless
 *  Shift holds it to a line break or an input method is composing. */
export function handleComposerKey({
  event,
  refs,
  setSuggestion,
}: {
  event: KeyboardEvent
  refs: ComposerRefs
  setSuggestion: SetComposerSuggestion
}) {
  const handled = handleSuggestionKey({
    event,
    onSelect: (item) =>
      selectSuggestion(
        refs.editor.current,
        refs,
        refs.suggestion.current,
        item,
        setSuggestion
      ),
    setSuggestion,
    state: refs.suggestion.current,
  })

  if (handled) {
    return true
  }

  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    sendDraft(refs.editor.current, refs)
    return true
  }

  return false
}

/** Puts the chosen suggestion where the sigil and its query stand. */
export function selectSuggestion(
  editor: Editor | null,
  refs: ComposerRefs,
  state: ComposerSuggestionState | null,
  item: MentionSuggestion,
  setSuggestion: SetComposerSuggestion
) {
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
export function insertMention(
  editor: Editor | null,
  refs: ComposerRefs,
  item: MentionSuggestion
) {
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

    if (item.target !== undefined) {
      refs.onMention.current?.(item.target)
    }
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
 *  name, and the field clears; nothing leaves while sending is closed or
 *  the draft is blank. */
export function sendDraft(editor: Editor | null, refs: ComposerRefs) {
  if (editor === null || !refs.open.current) {
    return
  }

  const draft = serializeComposerDocument(editor.getJSON())

  if (draft.text === "") {
    return
  }

  // The chips leave with the message, not by deletion.
  refs.mentioned = new Map()
  refs.onSend.current(draft.text, draft.references)
  editor.commands.clearContent(true)
}
