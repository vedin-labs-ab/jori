import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { canUseAutomationTool } from "../../automations/access"
import {
  canUseToolMode,
  getToolPermission,
  resolveToolMode,
  resolveToolModes,
} from "../../permissions/catalog"
import { type AgentRuntimeInput } from "./input"
import { toolExecutionType } from "./tools/policy"

export async function authorizeApprovedTool(
  ctx: ActionCtx,
  input: AgentRuntimeInput,
  approval: Doc<"approvals">
) {
  const permission = getToolPermission(approval.tool)

  if (permission === undefined || permission.surface !== approval.surface) {
    throw new Error(`Unknown ${approval.surface} tool: ${approval.tool}`)
  }

  const toolModes = resolveToolModes(
    await ctx.runQuery(internal.permissions.tools.listForRuntime, {
      tenantId: approval.tenantId,
    })
  )
  const mode = resolveToolMode(toolModes, approval.tool)

  if (!canUseToolMode(mode, toolExecutionType(input.type))) {
    throw new Error(`Tool is no longer available: ${approval.tool}`)
  }

  if (approval.surface !== "milo" && input.type === "automation") {
    const integration = input.integrations.find(
      (candidate) => candidate.integration === approval.surface
    )

    if (integration === undefined) {
      throw new Error(`No active ${approval.surface} integration is available`)
    }

    const isSelected = canUseAutomationTool(
      input.automation.access,
      integration._id,
      approval.tool
    )

    if (!isSelected) {
      throw new Error(
        `Tool is not allowed by automation access: ${approval.tool}`
      )
    }
  }

  return permission
}
