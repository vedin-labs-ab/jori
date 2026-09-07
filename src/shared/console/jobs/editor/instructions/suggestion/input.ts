import { type JSONContent } from "@tiptap/core"
import { type Editor } from "@tiptap/react"
import { type Dispatch, type SetStateAction } from "react"
import { isMentionNameCharacter } from "@/shared/console/mentions/scan"
import {
  insertMentionContent,
  mentionNodeContent,
  replaceTypedMention,
  textBeforeCursor,
} from "@/shared/console/mentions/suggest/insert"
import {
  findCompletedJobMention,
  getJobMentionSuggestions,
  type JobMention,
  type JobMentionCatalog,
  type JobMentionSources,
  type JobMentionSuggestion,
  type JobSurfaceIntegration,
} from "../../../access"
import { type JobPolicyPermissions } from "../../../access/policy"
import { getDefaultJobSurfaceTools } from "../../../access/tools"
import { addIntegrationTool } from "../access/update"
import {
  jobSurfaceNodeName,
  readJobSurfaceToolsForIntegration,
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
  permissions: JobPolicyPermissions
  suggestion: JobMentionSuggestion
  setSuggestion: Dispatch<SetStateAction<InstructionSuggestionState | null>>
  state: InstructionSuggestionState | null
}) {
  if (editor === null || state === null || suggestion.disabled) {
    return
  }

  const content = mentionContent(suggestion, permissions, editor.getJSON())
  const access = suggestion.access

  if (access?.kind === "web") {
    onWebAccessChange(true)
  }

  insertMentionContent(
    editor,
    state.range,
    content,
    access?.kind === "integration"
      ? (transaction) =>
          addIntegrationTool(transaction, access.integration, suggestion.id)
      : undefined
  )
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
  catalog: JobMentionCatalog
  from: number
  onWebAccessChange: WebAccessChange
  permissions: JobPolicyPermissions
  sources: JobMentionSources
  text: string
  to: number
  view: Editor["view"]
}) {
  if (from !== to || text.length !== 1 || isMentionNameCharacter(text)) {
    return false
  }

  const before = textBeforeCursor(view)
  const match = findCompletedJobMention(before, catalog)

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

  const transaction = replaceTypedMention({
    content: mentionContent(suggestion, permissions, view.state.doc.toJSON()),
    from,
    start: from - (before.length - match.start),
    text,
    view,
  })

  if (suggestion.access?.kind === "integration") {
    addIntegrationTool(
      transaction,
      suggestion.access.integration,
      suggestion.id
    )
  }

  view.dispatch(transaction.scrollIntoView())

  if (suggestion.access?.kind === "web") {
    onWebAccessChange(true)
  }

  return true
}

function completedSuggestion(
  mention: Pick<JobMention, "id" | "kind">,
  sources: JobMentionSources
): JobMentionSuggestion | null {
  if (mention.kind === "tool") {
    return (
      getJobMentionSuggestions(
        { kind: "tool", query: mention.id },
        sources
      ).find((item) => item.id === mention.id) ?? null
    )
  }

  if (mention.kind === "integration") {
    const integration = mention.id as JobSurfaceIntegration

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

/** The nodes a suggestion inserts: the mention itself, and before a tool
 *  whose integration the job does not yet name, that integration's pill. */
function mentionContent(
  suggestion: JobMentionSuggestion,
  permissions: JobPolicyPermissions,
  document: JSONContent
) {
  const content: JSONContent[] = []
  const access = suggestion.access

  if (
    access?.kind === "integration" &&
    readJobSurfaceToolsForIntegration(document, access.integration) ===
      undefined
  ) {
    content.push(surfaceNode(access.integration, [suggestion.id]))
    content.push({ text: " ", type: "text" })
  }

  content.push(mentionNode(suggestion, permissions, document))
  return content
}

function mentionNode(
  mention: Pick<JobMention, "id" | "kind">,
  permissions: JobPolicyPermissions,
  document: JSONContent
): JSONContent {
  if (mention.kind !== "integration") {
    return mentionNodeContent(mention, undefined)
  }

  const integration = mention.id as JobSurfaceIntegration
  const tools =
    readJobSurfaceToolsForIntegration(document, integration) ??
    getDefaultJobSurfaceTools(integration, permissions)

  return surfaceNode(integration, tools)
}

function surfaceNode(
  integration: JobSurfaceIntegration,
  tools: string[]
): JSONContent {
  return {
    attrs: { integration, tools },
    type: jobSurfaceNodeName,
  }
}
