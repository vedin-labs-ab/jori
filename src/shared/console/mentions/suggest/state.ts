import { type ResolvedPos } from "@tiptap/pm/model"
import { type Editor } from "@tiptap/react"
import {
  type ActiveMention,
  findActiveMention,
  maxActiveMentionLength,
} from "../active"
import { type MentionKind } from "../scan"

/** The listbox open under a sigil: the token being typed, what is
 *  offered for it, which row is active, where the token stands in the
 *  document, and where the listbox sits over the field. */
export type SuggestionState<Suggestion> = {
  active: ActiveMention
  activeIndex: number
  /** Why the list is empty, when it is. */
  empty: "empty" | "loading" | "unavailable"
  range: {
    from: number
    to: number
  }
  anchor: { contextElement: HTMLElement; getBoundingClientRect: () => DOMRect }
  side: "top" | "bottom"
  suggestions: Suggestion[]
}

export type SuggestionSource<Suggestion> = (active: ActiveMention) => {
  empty?: SuggestionState<Suggestion>["empty"]
  suggestions: Suggestion[]
}

export function getSuggestionState<Suggestion>(
  editor: Editor,
  options: {
    activeIndex?: number
    /** Whether a mention may start where the sigil stands: an editor with
     *  code spans keeps them inert. */
    isAllowed?: (position: ResolvedPos, sigilOffset: number) => boolean
    kinds: readonly MentionKind[]
    /** Which side of the caret the list opens on: below by default, above
     *  for a field at the foot of the screen. */
    placement?: "above" | "below"
    suggest: SuggestionSource<Suggestion>
  }
): SuggestionState<Suggestion> | null {
  const { selection } = editor.state

  if (!selection.empty) {
    return null
  }

  const textStart = Math.max(
    0,
    selection.$from.parentOffset - maxActiveMentionLength
  )
  const textBeforeCursor = selection.$from.parent.textBetween(
    textStart,
    selection.$from.parentOffset,
    "\n",
    "￼"
  )
  const active = findActiveMention(
    textBeforeCursor,
    textBeforeCursor.length,
    options.kinds
  )

  if (
    active === null ||
    options.isAllowed?.(selection.$from, textStart + active.start) === false
  ) {
    return null
  }

  const { empty = "empty", suggestions } = options.suggest(active)

  return {
    active,
    activeIndex: Math.min(
      options.activeIndex ?? 0,
      Math.max(suggestions.length - 1, 0)
    ),
    empty,
    range: {
      from: selection.from - (textBeforeCursor.length - active.start),
      to: selection.from,
    },
    anchor: {
      contextElement: editor.view.dom,
      getBoundingClientRect: () => getCaretRect(editor, selection.from),
    },
    side: options.placement === "above" ? "top" : "bottom",
    suggestions,
  }
}

/** Read the caret in viewport coordinates each time the popover positions,
 *  including after its editor or the page scrolls. */
function getCaretRect(editor: Editor, position: number): DOMRect {
  try {
    const { left, top, bottom } = editor.view.coordsAtPos(position)
    return new DOMRect(left, top, 0, bottom - top)
  } catch {
    return editor.view.dom.getBoundingClientRect()
  }
}
