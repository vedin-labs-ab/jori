import { type JsonObject } from "../../../contracts/json"
import { type ToolSurface } from "../../shared/integrations"

export type PromptedToolApproval = {
  surface: ToolSurface
  tool: string
  args: JsonObject
  summary: string
  handoff: {
    objective: string
    progress: string
    next: string
  }
}

export function parsePromptedToolApproval(args: {
  surface: ToolSurface
  tool: string
  args: JsonObject
}): PromptedToolApproval {
  const approval = args.args.approval

  if (!isApprovalObject(approval)) {
    throw new Error(
      `Tool requires approval: ${args.tool}. Include approval summary and handoff.`
    )
  }

  const { approval: _approval, ...toolArgs } = args.args

  return {
    surface: args.surface,
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

  const candidate = approval as JsonObject

  return (
    typeof candidate.summary === "string" &&
    candidate.summary !== "" &&
    isApprovalHandoff(candidate.handoff)
  )
}

function isApprovalHandoff(
  handoff: unknown
): handoff is PromptedToolApproval["handoff"] {
  const candidate = handoff as JsonObject

  return (
    typeof handoff === "object" &&
    handoff !== null &&
    !Array.isArray(handoff) &&
    typeof candidate.objective === "string" &&
    typeof candidate.progress === "string" &&
    typeof candidate.next === "string"
  )
}
