import { type Editor } from "@tiptap/react"
import { type CSSProperties } from "react"
import {
  type ActiveAutomationMention,
  type AutomationMentionSources,
  type AutomationMentionSuggestion,
  findActiveAutomationMention,
  getAutomationMentionSuggestions,
} from "../../../access"
import { isReferenceInputAllowed } from "./context"

export type InstructionSuggestionState = {
  active: ActiveAutomationMention
  activeIndex: number
  empty: "empty" | "loading" | "unavailable"
  range: {
    from: number
    to: number
  }
  style: CSSProperties
  suggestions: AutomationMentionSuggestion[]
}

export function getInstructionSuggestionState(
  editor: Editor,
  sources: AutomationMentionSources,
  activeIndex = 0
): InstructionSuggestionState | null {
  const { selection } = editor.state

  if (!selection.empty) {
    return null
  }

  const textBeforeCursor = selection.$from.parent.textBetween(
    0,
    selection.$from.parentOffset,
    "\n",
    "￼"
  )
  const activeMention = findActiveAutomationMention(
    textBeforeCursor,
    textBeforeCursor.length
  )

  if (
    activeMention === null ||
    !isReferenceInputAllowed(selection.$from, activeMention.start)
  ) {
    return null
  }

  const suggestions = getAutomationMentionSuggestions(activeMention, sources)

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
  active: ActiveAutomationMention,
  sources: AutomationMentionSources
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

    const menuWidth = 256
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
