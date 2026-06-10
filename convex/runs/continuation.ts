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
    "A previous Milo run paused to request approval for one tool call. The user approved it, Milo executed the approved tool call, and this run should continue the original work from the handoff below.",
    "",
    "## Original Objective",
    continuation.handoff.objective,
    "",
    "## Progress Before Approval",
    continuation.handoff.progress,
    "",
    "## Approved Action",
    `- Provider: ${continuation.action.provider}`,
    `- Tool: ${continuation.action.tool}`,
    `- Summary: ${continuation.action.summary}`,
    "- Arguments:",
    fencedJson(continuation.action.args),
    "",
    "## Tool Result",
    fencedJson(continuation.result),
    "",
    "## Continue From Here",
    continuation.handoff.next,
    "",
    "Use the tool result and the handoff context to continue the task. Do not repeat the approved tool call unless a new user request clearly requires it.",
  ].join("\n")
}

function fencedJson(value: unknown) {
  return ["```json", JSON.stringify(value, null, 2), "```"].join("\n")
}
