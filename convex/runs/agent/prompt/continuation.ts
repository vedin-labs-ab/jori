import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { createPromptTime } from "../../../prompts/time"

export type ApprovalContinuation = {
  decision: "approved" | "denied"
  handoff: {
    objective: string
    progress: string
    next: string
  }
  action: {
    surface: string
    tool: string
    summary: string
    args: unknown
  }
  result: unknown
}

export function createApprovalContinuationPrompt(
  continuation: ApprovalContinuation
) {
  const decision = getDecisionPromptValues(continuation.decision)

  return renderPromptTemplate(promptTemplates["approval/continuation"], {
    action: {
      ...continuation.action,
      args: stringifyPromptJson(continuation.action.args),
    },
    decision,
    handoff: continuation.handoff,
    result: stringifyPromptJson(continuation.result),
    time: { utc: createPromptTime() },
  })
}

function getDecisionPromptValues(decision: ApprovalContinuation["decision"]) {
  if (decision === "approved") {
    return {
      instructions: promptTemplates["approval/approved/instructions"].trim(),
      summary: promptTemplates["approval/approved/summary"].trim(),
    }
  }

  return {
    instructions: promptTemplates["approval/denied/instructions"].trim(),
    summary: promptTemplates["approval/denied/summary"].trim(),
  }
}

function stringifyPromptJson(value: unknown) {
  return JSON.stringify(value) ?? "null"
}
