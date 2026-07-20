import { type Scope } from "../../contracts/permissions/scope"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type MiloToolRequest, readRecord } from "../shared/input"
import { type AutomationAccessInput } from "./access"
import { type AutomationTriggerInput, type AutomationType } from "./schema"

type AddAutomationArgs = {
  artifactId?: Id<"artifacts">
  key?: string
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
    organizationId: string
    createdBy?: Id<"persons">
    automationId?: Id<"automations">
    automationConfigurationVersion?: number
  },
  request: MiloToolRequest
) {
  const args = readRecord(request.args)

  if (request.tool === "add_automation") {
    const input = args as AddAutomationArgs
    return await ctx.runMutation(internal.automations.records.create, {
      ...input,
      organizationId: execution.organizationId,
      createdBy: execution.createdBy,
      parentId: input.type === "once" ? execution.automationId : undefined,
      expectedParentConfigurationVersion:
        input.type === "once"
          ? execution.automationConfigurationVersion
          : undefined,
    })
  }

  if (request.tool === "search_automations") {
    return await ctx.runQuery(internal.automations.records.search, {
      ...(args as SearchAutomationsArgs),
      organizationId: execution.organizationId,
      personId: execution.createdBy,
    })
  }

  if (request.tool === "read_automation") {
    return await ctx.runQuery(internal.automations.records.read, {
      ...(args as ReadAutomationArgs),
      organizationId: execution.organizationId,
      personId: execution.createdBy,
    })
  }

  if (request.tool === "update_automation") {
    return await ctx.runMutation(internal.automations.records.update, {
      ...(args as UpdateAutomationArgs),
      organizationId: execution.organizationId,
      personId: execution.createdBy,
    })
  }

  if (request.tool === "delete_automation") {
    return await ctx.runMutation(internal.automations.records.remove, {
      ...(args as ReadAutomationArgs),
      organizationId: execution.organizationId,
      personId: execution.createdBy,
    })
  }

  throw new Error(`Unknown Milo tool: ${request.tool}`)
}
