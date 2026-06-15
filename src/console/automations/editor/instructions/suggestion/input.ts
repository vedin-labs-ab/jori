import { type JSONContent } from "@tiptap/core"
import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction } from "react"
import {
  type AutomationSurfaceIntegration,
  findCompletedAutomationSurfaceMention,
  isMentionNameCharacter,
} from "../../../access"
import { type AutomationPolicyPermissions } from "../../../access/policy"
import { getDefaultAutomationSurfaceTools } from "../../../access/tools"
import {
  automationSurfaceNodeName,
  readAutomationSurfaceToolsForIntegration,
} from "../document"
import { type InstructionSuggestionState } from "./suggest"

export function insertSurfaceSuggestion({
  editor,
  permissions,
  integration,
  setSuggestion,
  state,
}: {
  editor: Editor | null
  permissions: AutomationPolicyPermissions
  integration: AutomationSurfaceIntegration
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
        integration,
        shouldInsertTrailingSpace(editor, state.range.to),
        permissions,
        readAutomationSurfaceToolsForIntegration(editor.getJSON(), integration)
      )
    )
    .run()
  setSuggestion(null)
}

export function replaceCompletedSurfaceMention({
  from,
  permissions,
  text,
  to,
  view,
}: {
  from: number
  permissions: AutomationPolicyPermissions
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
  const match = findCompletedAutomationSurfaceMention(textBeforeCursor)

  if (match === null) {
    return false
  }

  const start = from - (textBeforeCursor.length - match.start)
  const surfaceNode = view.state.schema.nodes[automationSurfaceNodeName]

  if (surfaceNode === undefined) {
    return false
  }

  const transaction = view.state.tr.replaceWith(
    start,
    from,
    surfaceNode.create(
      createSurfaceNodeAttrs(
        match.integration,
        permissions,
        readAutomationSurfaceToolsForIntegration(
          view.state.doc.toJSON(),
          match.integration
        )
      )
    )
  )

  transaction.insertText(text, start + 1)
  view.dispatch(transaction.scrollIntoView())

  return true
}

function getSurfaceInsertionContent(
  integration: AutomationSurfaceIntegration,
  includeTrailingSpace: boolean,
  permissions: AutomationPolicyPermissions,
  existingTools: string[] | undefined
) {
  const content: JSONContent[] = [
    {
      attrs: createSurfaceNodeAttrs(integration, permissions, existingTools),
      type: automationSurfaceNodeName,
    },
  ]

  if (includeTrailingSpace) {
    content.push({ text: " ", type: "text" })
  }

  return content
}

function createSurfaceNodeAttrs(
  integration: AutomationSurfaceIntegration,
  permissions: AutomationPolicyPermissions,
  existingTools: string[] | undefined
) {
  return {
    integration,
    tools:
      existingTools ??
      getDefaultAutomationSurfaceTools(integration, permissions),
  }
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
