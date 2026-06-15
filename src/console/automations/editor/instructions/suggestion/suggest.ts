import { type Editor } from "@tiptap/react"
import { type CSSProperties } from "react"
import {
  type AutomationSurfaceSuggestion,
  findActiveAutomationSurfaceMention,
  getAutomationSurfaceSuggestions,
} from "../../../surface"

export type InstructionSuggestionState = {
  activeIndex: number
  range: {
    from: number
    to: number
  }
  style: CSSProperties
  suggestions: AutomationSurfaceSuggestion[]
}

export function getInstructionSuggestionState(
  editor: Editor,
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
    "\uFFFC"
  )
  const activeMention = findActiveAutomationSurfaceMention(
    textBeforeCursor,
    textBeforeCursor.length
  )

  if (activeMention === null) {
    return null
  }

  const suggestions = getAutomationSurfaceSuggestions(activeMention.query)

  if (suggestions.length === 0) {
    return null
  }

  const nextActiveIndex = Math.min(activeIndex, suggestions.length - 1)

  return {
    activeIndex: nextActiveIndex,
    range: {
      from: selection.from - (textBeforeCursor.length - activeMention.start),
      to: selection.from,
    },
    style: getSuggestionStyle(editor, selection.from),
    suggestions,
  }
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
