import { type Scope } from "../../contracts/permissions/scope"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { readRecord } from "../shared/input"
import { type AutomationAccessInput } from "./access"
import { type AutomationTriggerInput, type AutomationType } from "./schema"

type MiloMcpRequest = {
  tool: string
  args?: unknown
}

type AddAutomationArgs = {
  artifactId?: Id<"artifacts">
  name: string
  instructions: string
  scope?: Scope
  access: AutomationAccessInput
  type: AutomationType
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
  artifactId?: Id<"artifacts">
  name?: string
  instructions?: string
  scope?: Scope
  access?: AutomationAccessInput
  type?: AutomationType
  trigger?: AutomationTriggerInput
}

export async function callMiloAutomationTool(
  ctx: ActionCtx,
  execution: {
    tenantId: string
    createdBy?: Id<"persons">
  },
  request: MiloMcpRequest
) {
  const args = readRecord(request.args)

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
      personId: execution.createdBy,
    })
  }

  if (request.tool === "read_automation") {
    return await ctx.runQuery(internal.automations.records.read, {
      ...(args as ReadAutomationArgs),
      tenantId: execution.tenantId,
      personId: execution.createdBy,
    })
  }

  if (request.tool === "update_automation") {
    return await ctx.runMutation(internal.automations.records.update, {
      ...(args as UpdateAutomationArgs),
      tenantId: execution.tenantId,
      personId: execution.createdBy,
    })
  }

  if (request.tool === "delete_automation") {
    return await ctx.runMutation(internal.automations.records.remove, {
      ...(args as ReadAutomationArgs),
      tenantId: execution.tenantId,
      personId: execution.createdBy,
    })
  }

  throw new Error(`Unknown Milo tool: ${request.tool}`)
}
