import {
  approvalSummaryValidationError,
  readApprovalSummary,
} from "../../../contracts/approvals"
import { type JsonObject } from "../../../contracts/json"
import { type ToolSurface } from "../../shared/integrations"
import { normalizeBrokerToolInput } from "../input"

type PromptedToolApproval = {
  surface: ToolSurface
  tool: string
  args: JsonObject
  summary: string
}

export function parsePromptedToolApproval(args: {
  surface: ToolSurface
  tool: string
  args: JsonObject
}): PromptedToolApproval {
  const summary = readApprovalSummary(args.args)

  if (summary === null) {
    throw new Error(approvalSummaryValidationError(args.tool))
  }

  const { approval: _approval, final: _final, ...toolArgs } = args.args

  return {
    surface: args.surface,
    tool: args.tool,
    args: normalizeBrokerToolInput(args.tool, toolArgs),
    summary,
  }
}
