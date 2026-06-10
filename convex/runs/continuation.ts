import { promptTemplates } from "../prompts/generated"
import { renderPromptTemplate } from "../prompts/render"

export type ApprovalContinuation = {
  handoff: {
    objective: string
    progress: string
    next: string
  }
  action: {
    provider: string
    tool: string
    summary: string
    args: unknown
  }
  result: unknown
}

export function createApprovalContinuationPrompt(
  continuation: ApprovalContinuation
) {
  return renderPromptTemplate(promptTemplates["approval/continuation"], {
    action: {
      ...continuation.action,
      args: stringifyPromptJson(continuation.action.args),
    },
    handoff: continuation.handoff,
    result: stringifyPromptJson(continuation.result),
  })
}

function stringifyPromptJson(value: unknown) {
  return JSON.stringify(value) ?? "null"
}
