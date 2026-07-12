import { type JSONContent } from "@tiptap/core"
import { Fragment, type Mark, type Schema } from "@tiptap/pm/model"
import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction } from "react"
import {
  type AutomationMention,
  type AutomationMentionCatalog,
  type AutomationMentionSources,
  type AutomationMentionSuggestion,
  type AutomationSurfaceIntegration,
  findCompletedAutomationMention,
  getAutomationMentionSuggestions,
  isMentionNameCharacter,
} from "../../../access"
import { type AutomationPolicyPermissions } from "../../../access/policy"
import { getDefaultAutomationSurfaceTools } from "../../../access/tools"
import { addIntegrationTool } from "../access/update"
import {
  automationReferenceNodeName,
  automationSurfaceNodeName,
  readAutomationSurfaceToolsForIntegration,
} from "../document"
import { isReferenceInputAllowed } from "./context"
import { type InstructionSuggestionState } from "./suggest"

type WebAccessChange = (enabled: boolean) => void

export function insertMentionSuggestion({
  editor,
  onWebAccessChange,
  permissions,
  suggestion,
  setSuggestion,
  state,
}: {
  editor: Editor | null
  onWebAccessChange: WebAccessChange
  permissions: AutomationPolicyPermissions
  suggestion: AutomationMentionSuggestion
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
  state: InstructionSuggestionState | null
}) {
  if (editor === null || state === null || suggestion.disabled) {
    return
  }

  const document = editor.getJSON()
  const marks = activeMarks(editor)
  const content = mentionContent(suggestion, permissions, document, marks)
  const access = suggestion.access
  let chain = editor.chain().focus()

  if (access?.kind === "integration") {
    chain = chain.command(({ tr }) => {
      addIntegrationTool(tr, access.integration, suggestion.id)
      return true
    })
  } else if (access?.kind === "web") {
    onWebAccessChange(true)
  }

  if (shouldInsertTrailingSpace(editor, state.range.to)) {
    content.push({ marks, text: " ", type: "text" })
  }

  chain.insertContentAt(state.range, content).run()
  setSuggestion(null)
}

/** Typing a boundary character after a finished token converts it into a
 * pill. This is an explicit choice, so eligible access is added with it. */
export function replaceCompletedMention({
  catalog,
  from,
  onWebAccessChange,
  permissions,
  sources,
  text,
  to,
  view,
}: {
  catalog: AutomationMentionCatalog
  from: number
  onWebAccessChange: WebAccessChange
  permissions: AutomationPolicyPermissions
  sources: AutomationMentionSources
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

  if (
    match === null ||
    !isReferenceInputAllowed(view.state.selection.$from, match.start)
  ) {
    return false
  }

  const suggestion = completedSuggestion(match, sources)

  if (suggestion === null) {
    return false
  }

  const start = from - (textBeforeCursor.length - match.start)
  const marks = view.state.storedMarks ?? view.state.selection.$from.marks()
  const document = view.state.doc.toJSON()
  const content = mentionContent(
    suggestion,
    permissions,
    document,
    marks.map((mark) => mark.toJSON())
  )
  const transaction = view.state.tr

  if (suggestion.access?.kind === "integration") {
    addIntegrationTool(
      transaction,
      suggestion.access.integration,
      suggestion.id
    )
  }

  const nodes = content.map((node) =>
    toProseMirrorNode(node, view.state.schema, marks)
  )
  transaction.replaceWith(start, from, Fragment.fromArray(nodes))
  transaction.insertText(
    text,
    start + nodes.reduce((size, node) => size + node.nodeSize, 0)
  )
  view.dispatch(transaction.scrollIntoView())

  if (suggestion.access?.kind === "web") {
    onWebAccessChange(true)
  }

  return true
}

function completedSuggestion(
  mention: Pick<AutomationMention, "id" | "kind">,
  sources: AutomationMentionSources
): AutomationMentionSuggestion | null {
  if (mention.kind === "tool") {
    return (
      getAutomationMentionSuggestions(
        { kind: "tool", query: mention.id },
        sources
      ).find((item) => item.id === mention.id) ?? null
    )
  }

  if (mention.kind === "integration") {
    const integration = mention.id as AutomationSurfaceIntegration

    return {
      id: integration,
      kind: "integration",
      label: mention.id,
      surface: integration,
    }
  }

  return {
    id: mention.id,
    kind: "skill",
    label: mention.id,
  }
}

function mentionContent(
  suggestion: AutomationMentionSuggestion,
  permissions: AutomationPolicyPermissions,
  document: JSONContent,
  marks: JSONContent["marks"]
) {
  const content: JSONContent[] = []
  const access = suggestion.access

  if (
    access?.kind === "integration" &&
    readAutomationSurfaceToolsForIntegration(document, access.integration) ===
      undefined
  ) {
    content.push(surfaceNode(access.integration, [suggestion.id], marks))
    content.push({ marks, text: " ", type: "text" })
  }

  content.push(mentionNode(suggestion, permissions, document, marks))
  return content
}

function mentionNode(
  mention: Pick<AutomationMention, "id" | "kind">,
  permissions: AutomationPolicyPermissions,
  document: JSONContent,
  marks: JSONContent["marks"]
): JSONContent {
  if (mention.kind !== "integration") {
    return {
      attrs: { id: mention.id, kind: mention.kind },
      marks,
      type: automationReferenceNodeName,
    }
  }

  const integration = mention.id as AutomationSurfaceIntegration
  const tools =
    readAutomationSurfaceToolsForIntegration(document, integration) ??
    getDefaultAutomationSurfaceTools(integration, permissions)

  return surfaceNode(integration, tools, marks)
}

function surfaceNode(
  integration: AutomationSurfaceIntegration,
  tools: string[],
  marks: JSONContent["marks"]
): JSONContent {
  return {
    attrs: { integration, tools },
    marks,
    type: automationSurfaceNodeName,
  }
}

function activeMarks(editor: Editor) {
  const marks = editor.state.selection.$from
    .marks()
    .map((mark) => mark.toJSON())

  return marks.length === 0 ? undefined : marks
}

function toProseMirrorNode(
  node: JSONContent,
  schema: Schema,
  marks: readonly Mark[]
) {
  if (node.type === "text") {
    return schema.text(node.text ?? "", marks)
  }

  const nodeType = schema.nodes[node.type ?? ""]

  if (nodeType === undefined) {
    throw new Error(`Unknown instruction node: ${node.type}`)
  }

  return nodeType.create(node.attrs, undefined, marks)
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
