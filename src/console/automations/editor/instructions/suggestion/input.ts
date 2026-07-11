import { type JSONContent } from "@tiptap/core"
import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction } from "react"
import {
  type AutomationMention,
  type AutomationMentionCatalog,
  type AutomationMentionSuggestion,
  type AutomationSurfaceIntegration,
  findCompletedAutomationMention,
  isMentionNameCharacter,
} from "../../../access"
import { type AutomationPolicyPermissions } from "../../../access/policy"
import { getDefaultAutomationSurfaceTools } from "../../../access/tools"
import {
  automationReferenceNodeName,
  automationSurfaceNodeName,
  readAutomationSurfaceToolsForIntegration,
} from "../document"
import { type InstructionSuggestionState } from "./suggest"

export function insertMentionSuggestion({
  editor,
  permissions,
  suggestion,
  setSuggestion,
  state,
}: {
  editor: Editor | null
  permissions: AutomationPolicyPermissions
  suggestion: AutomationMentionSuggestion
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
  state: InstructionSuggestionState | null
}) {
  if (editor === null || state === null) {
    return
  }

  const content: JSONContent[] = [
    mentionNodeContent(suggestion, permissions, editor.getJSON()),
  ]

  if (shouldInsertTrailingSpace(editor, state.range.to)) {
    content.push({ text: " ", type: "text" })
  }

  editor.chain().focus().insertContentAt(state.range, content).run()
  setSuggestion(null)
}

/** Typing a boundary character after a finished token converts it into a
 *  pill in place — the keyboard-only path to what the picker does. */
export function replaceCompletedMention({
  catalog,
  from,
  permissions,
  text,
  to,
  view,
}: {
  catalog: AutomationMentionCatalog
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
    "￼"
  )
  const match = findCompletedAutomationMention(textBeforeCursor, catalog)

  if (match === null) {
    return false
  }

  const start = from - (textBeforeCursor.length - match.start)
  const node = mentionNode(match, permissions, view.state.doc.toJSON())
  const nodeType = view.state.schema.nodes[node.type ?? ""]

  if (nodeType === undefined) {
    return false
  }

  const transaction = view.state.tr.replaceWith(
    start,
    from,
    nodeType.create(node.attrs)
  )

  transaction.insertText(text, start + 1)
  view.dispatch(transaction.scrollIntoView())

  return true
}

function mentionNodeContent(
  suggestion: AutomationMentionSuggestion,
  permissions: AutomationPolicyPermissions,
  document: JSONContent
): JSONContent {
  return mentionNode(
    { kind: suggestion.kind, id: suggestion.id },
    permissions,
    document
  )
}

function mentionNode(
  mention: Pick<AutomationMention, "id" | "kind">,
  permissions: AutomationPolicyPermissions,
  document: JSONContent
): JSONContent {
  if (mention.kind !== "integration") {
    return {
      attrs: { id: mention.id, kind: mention.kind },
      type: automationReferenceNodeName,
    }
  }

  const integration = mention.id as AutomationSurfaceIntegration

  return {
    attrs: {
      integration,
      tools:
        readAutomationSurfaceToolsForIntegration(document, integration) ??
        getDefaultAutomationSurfaceTools(integration, permissions),
    },
    type: automationSurfaceNodeName,
  }
}

function shouldInsertTrailingSpace(editor: Editor, position: number) {
  const nextCharacter = editor.state.doc.textBetween(
    position,
    Math.min(position + 1, editor.state.doc.content.size),
    "\n",
    "￼"
  )

  return nextCharacter === "" || isMentionNameCharacter(nextCharacter)
}
