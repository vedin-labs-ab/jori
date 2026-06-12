import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type AutomationAccessInput } from "./access"
import { type AutomationTriggerInput } from "./schema"

type MiloMcpRequest = {
  tool: string
  args?: unknown
}

type AddAutomationArgs = {
  name: string
  instructions: string
  metadata?: unknown
  access: AutomationAccessInput
  trigger: AutomationTriggerInput
}

type SearchAutomationsArgs = {
  query?: string
  includeCompleted?: boolean
  limit?: number
}

type ReadAutomationArgs = {
  automationId: Id<"automations">
}

type UpdateAutomationArgs = {
  automationId: Id<"automations">
  name?: string
  instructions?: string
  metadata?: unknown
  access?: AutomationAccessInput
  trigger?: AutomationTriggerInput
}

export async function callMiloAutomationTool(
  ctx: ActionCtx,
  execution: {
    tenantId: string
    createdBy?: string
  },
  request: MiloMcpRequest
) {
  const args = normalizeToolArgs(request.args)

  if (request.tool === "add_automation") {
    return await ctx.runMutation(internal.automations.records.create, {
      ...(args as AddAutomationArgs),
      tenantId: execution.tenantId,
      createdBy: execution.createdBy,
    })
  }

  if (request.tool === "search_automations") {
    return await ctx.runQuery(internal.automations.records.search, {
      ...(args as SearchAutomationsArgs),
      tenantId: execution.tenantId,
    })
  }

  if (request.tool === "read_automation") {
    return await ctx.runQuery(internal.automations.records.read, {
      ...(args as ReadAutomationArgs),
      tenantId: execution.tenantId,
    })
  }

  if (request.tool === "update_automation") {
    return await ctx.runMutation(internal.automations.records.update, {
      ...(args as UpdateAutomationArgs),
      tenantId: execution.tenantId,
    })
  }

  if (request.tool === "delete_automation") {
    return await ctx.runMutation(internal.automations.records.remove, {
      ...(args as ReadAutomationArgs),
      tenantId: execution.tenantId,
    })
  }

  throw new Error(`Unknown Milo tool: ${request.tool}`)
}

function normalizeToolArgs(args: unknown) {
  if (typeof args !== "object" || args === null || Array.isArray(args)) {
    return {}
  }

  return args
}
