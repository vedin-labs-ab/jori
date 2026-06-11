import { type JSONContent } from "@tiptap/core"
import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction } from "react"
import {
  defaultScheduleSurfaceAccess,
  findCompletedScheduleSurfaceMention,
  isMentionNameCharacter,
  type ScheduleReadScope,
  type ScheduleSurfaceProvider,
} from "../surfaces"
import { scheduleSurfaceNodeName } from "./document"
import { type InstructionSuggestionState } from "./suggest"

export function insertSurfaceSuggestion({
  editor,
  provider,
  readScope,
  setSuggestion,
  state,
}: {
  editor: Editor | null
  provider: ScheduleSurfaceProvider
  readScope: ScheduleReadScope
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
  state: InstructionSuggestionState | null
}) {
  if (editor === null || state === null) {
    return
  }

  editor
    .chain()
    .focus()
    .insertContentAt(
      state.range,
      getSurfaceInsertionContent(
        provider,
        readScope,
        shouldInsertTrailingSpace(editor, state.range.to)
      )
    )
    .run()
  setSuggestion(null)
}

export function replaceCompletedSurfaceMention({
  from,
  readScope,
  text,
  to,
  view,
}: {
  from: number
  readScope: ScheduleReadScope
  text: string
  to: number
  view: Editor["view"]
}) {
  if (from !== to || text.length !== 1 || isMentionNameCharacter(text)) {
    return false
  }

  const textBeforeCursor = view.state.selection.$from.parent.textBetween(
    0,
    view.state.selection.$from.parentOffset,
    "\n",
    "\uFFFC"
  )
  const match = findCompletedScheduleSurfaceMention(textBeforeCursor)

  if (match === null) {
    return false
  }

  const start = from - (textBeforeCursor.length - match.start)
  const surfaceNode = view.state.schema.nodes[scheduleSurfaceNodeName]

  if (surfaceNode === undefined) {
    return false
  }

  const transaction = view.state.tr.replaceWith(
    start,
    from,
    surfaceNode.create({
      access: defaultScheduleSurfaceAccess(readScope),
      provider: match.provider,
    })
  )

  transaction.insertText(text, start + 1)
  view.dispatch(transaction.scrollIntoView())

  return true
}

function getSurfaceInsertionContent(
  provider: ScheduleSurfaceProvider,
  readScope: ScheduleReadScope,
  includeTrailingSpace: boolean
) {
  const content: JSONContent[] = [
    {
      attrs: {
        access: defaultScheduleSurfaceAccess(readScope),
        provider,
      },
      type: scheduleSurfaceNodeName,
    },
  ]

  if (includeTrailingSpace) {
    content.push({ text: " ", type: "text" })
  }

  return content
}

function shouldInsertTrailingSpace(editor: Editor, position: number) {
  const nextCharacter = editor.state.doc.textBetween(
    position,
    Math.min(position + 1, editor.state.doc.content.size),
    "\n",
    "\uFFFC"
  )

  return nextCharacter === "" || isMentionNameCharacter(nextCharacter)
}
