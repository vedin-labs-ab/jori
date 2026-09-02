import { type Editor } from "@tiptap/react"
import { type CSSProperties } from "react"
import {
  type ActiveJobMention,
  findActiveJobMention,
  getJobMentionSuggestions,
  type JobMentionSources,
  type JobMentionSuggestion,
  maxActiveJobMentionLength,
} from "../../../access"
import { isReferenceInputAllowed } from "./context"

export type InstructionSuggestionState = {
  active: ActiveJobMention
  activeIndex: number
  empty: "empty" | "loading" | "unavailable"
  range: {
    from: number
    to: number
  }
  style: CSSProperties
  suggestions: JobMentionSuggestion[]
}

export function getInstructionSuggestionState(
  editor: Editor,
  sources: JobMentionSources,
  activeIndex = 0
): InstructionSuggestionState | null {
  const { selection } = editor.state

  if (!selection.empty) {
    return null
  }

  const textStart = Math.max(
    0,
    selection.$from.parentOffset - maxActiveJobMentionLength
  )
  const textBeforeCursor = selection.$from.parent.textBetween(
    textStart,
    selection.$from.parentOffset,
    "\n",
    "￼"
  )
  const activeMention = findActiveJobMention(
    textBeforeCursor,
    textBeforeCursor.length
  )

  if (
    activeMention === null ||
    !isReferenceInputAllowed(selection.$from, textStart + activeMention.start)
  ) {
    return null
  }

  const suggestions = getJobMentionSuggestions(activeMention, sources)

  const nextActiveIndex = Math.min(
    activeIndex,
    Math.max(suggestions.length - 1, 0)
  )

  return {
    active: activeMention,
    activeIndex: nextActiveIndex,
    empty: suggestionEmptyState(activeMention, sources),
    range: {
      from: selection.from - (textBeforeCursor.length - activeMention.start),
      to: selection.from,
    },
    style: getSuggestionStyle(editor, selection.from),
    suggestions,
  }
}

function suggestionEmptyState(
  active: ActiveJobMention,
  sources: JobMentionSources
): InstructionSuggestionState["empty"] {
  if (active.kind === "tool" && sources.permissions === undefined) {
    return "loading"
  }

  return active.kind === "tool" && sources.permissions === null
    ? "unavailable"
    : "empty"
}

function getSuggestionStyle(editor: Editor, position: number): CSSProperties {
  try {
    const coords = editor.view.coordsAtPos(position)
    const container = editor.view.dom.parentElement?.getBoundingClientRect()

    if (container === undefined) {
      return { left: 0, top: "100%" }
    }

    // Match the menu's w-72 class so horizontal clamping stays accurate.
    const menuWidth = 288
    const left = Math.min(
      Math.max(coords.left - container.left, 0),
      Math.max(container.width - menuWidth, 0)
    )

    return {
      left,
      top: coords.bottom - container.top + 4,
    }
  } catch {
    return { left: 0, top: "100%" }
  }
}
