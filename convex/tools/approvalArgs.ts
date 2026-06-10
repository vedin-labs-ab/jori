import { type Provider } from "../providers/catalog"

export type ApprovalToolArgs = {
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

export function parseApprovalToolArgs(
  args: Record<string, unknown>
): ApprovalToolArgs {
  const provider = args.provider
  const tool = args.tool
  const summary = args.summary
  const handoff = args.handoff

  if (!isProvider(provider)) {
    throw new Error("Approval request requires a valid provider")
  }

  if (typeof tool !== "string" || tool === "") {
    throw new Error("Approval request requires a tool")
  }

  if (typeof summary !== "string" || summary === "") {
    throw new Error("Approval request requires a summary")
  }

  if (!isApprovalHandoff(handoff)) {
    throw new Error(
      "Approval request requires handoff objective, progress, and next"
    )
  }

  return {
    provider,
    tool,
    args: normalizeToolArgs(args.args),
    summary,
    handoff,
  }
}

function isProvider(provider: unknown): provider is Provider {
  return (
    provider === "milo" ||
    provider === "slack" ||
    provider === "linear" ||
    provider === "github" ||
    provider === "gmail" ||
    provider === "googleCalendar" ||
    provider === "notion" ||
    provider === "microsoftEmail" ||
    provider === "microsoftCalendar"
  )
}

function isApprovalHandoff(
  handoff: unknown
): handoff is ApprovalToolArgs["handoff"] {
  return (
    typeof handoff === "object" &&
    handoff !== null &&
    !Array.isArray(handoff) &&
    typeof (handoff as Record<string, unknown>).objective === "string" &&
    typeof (handoff as Record<string, unknown>).progress === "string" &&
    typeof (handoff as Record<string, unknown>).next === "string"
  )
}

function normalizeToolArgs(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {}
  }

  return args as Record<string, unknown>
}
