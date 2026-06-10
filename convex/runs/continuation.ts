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
  return [
    "# Approval Continuation",
    "",
    "A previous run paused to request user approval for one tool call. The user approved it and the call has been executed; its result is below and may be an error. Continue the task from the handoff. Do not repeat the approved tool call unless a new user request clearly requires it.",
    "",
    "## Objective",
    continuation.handoff.objective,
    "",
    "## Progress Before Approval",
    continuation.handoff.progress,
    "",
    "## Approved Action",
    `${continuation.action.provider}.${continuation.action.tool}: ${continuation.action.summary}`,
    "",
    fencedJson(continuation.action.args),
    "",
    "## Result",
    fencedJson(continuation.result),
    "",
    "## Next",
    continuation.handoff.next,
  ].join("\n")
}

function fencedJson(value: unknown) {
  return ["```json", JSON.stringify(value), "```"].join("\n")
}
