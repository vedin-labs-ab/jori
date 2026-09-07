import { type ResolvedPos } from "@tiptap/pm/model"
import { type Editor } from "@tiptap/react"
import { type CSSProperties } from "react"
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
  style: CSSProperties
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
    style: getSuggestionStyle(
      editor,
      selection.from,
      options.placement ?? "below"
    ),
    suggestions,
  }
}

function getSuggestionStyle(
  editor: Editor,
  position: number,
  placement: "above" | "below"
): CSSProperties {
  const fallback =
    placement === "above"
      ? { left: 0, bottom: "100%" }
      : { left: 0, top: "100%" }

  try {
    const coords = editor.view.coordsAtPos(position)
    const container = editor.view.dom.parentElement?.getBoundingClientRect()

    if (container === undefined) {
      return fallback
    }

    // Match the menu's w-72 class so horizontal clamping stays accurate.
    const menuWidth = 288
    const left = Math.min(
      Math.max(coords.left - container.left, 0),
      Math.max(container.width - menuWidth, 0)
    )

    return placement === "above"
      ? { left, bottom: container.bottom - coords.top + 4 }
      : { left, top: coords.bottom - container.top + 4 }
  } catch {
    return fallback
  }
}
