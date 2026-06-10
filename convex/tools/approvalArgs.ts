import { type Provider } from "../providers/catalog"

export type PromptedToolApproval = {
  provider: Provider
  tool: string
  args: Record<string, unknown>
  summary: string
  handoff: {
    objective: string
    progress: string
    next: string
  }
}

export function parsePromptedToolApproval(args: {
  provider: Provider
  tool: string
  args: Record<string, unknown>
}): PromptedToolApproval {
  const approval = args.args.approval

  if (!isApprovalObject(approval)) {
    throw new Error(
      `Tool requires approval: ${args.tool}. Include approval summary and handoff.`
    )
  }

  const { approval: _approval, ...toolArgs } = args.args

  return {
    provider: args.provider,
    tool: args.tool,
    args: toolArgs,
    summary: approval.summary,
    handoff: approval.handoff,
  }
}

function isApprovalObject(
  approval: unknown
): approval is Pick<PromptedToolApproval, "summary" | "handoff"> {
  if (
    typeof approval !== "object" ||
    approval === null ||
    Array.isArray(approval)
  ) {
    return false
  }

  const candidate = approval as Record<string, unknown>

  return (
    typeof candidate.summary === "string" &&
    candidate.summary !== "" &&
    isApprovalHandoff(candidate.handoff)
  )
}

function isApprovalHandoff(
  handoff: unknown
): handoff is PromptedToolApproval["handoff"] {
  return (
    typeof handoff === "object" &&
    handoff !== null &&
    !Array.isArray(handoff) &&
    typeof (handoff as Record<string, unknown>).objective === "string" &&
    typeof (handoff as Record<string, unknown>).progress === "string" &&
    typeof (handoff as Record<string, unknown>).next === "string"
  )
}
