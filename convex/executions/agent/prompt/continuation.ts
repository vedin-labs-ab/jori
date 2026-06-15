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
      summary: "approved the action",
      instructions:
        "Do not repeat the approved action. If the result is an error, report what failed instead of retrying it.",
    }
  }

  return {
    summary: "denied the action",
    instructions:
      "Do not run the denied action or an equivalent write without a new approval. If a safe path remains, continue. Otherwise say what is blocked and ask how to proceed.",
  }
}

function stringifyPromptJson(value: unknown) {
  return JSON.stringify(value) ?? "null"
}
