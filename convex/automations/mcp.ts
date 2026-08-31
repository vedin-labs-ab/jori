import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type JoriToolRequest, readRecord } from "../shared/input"
import { visibilityFromInput } from "../visibility/schema"
import { type AutomationAccessInput } from "./access"
import { type AutomationTriggerInput, type AutomationType } from "./schema"

type AddAutomationArgs = {
  key?: string
  name: string
  instructions: string
  visibility?: "private" | "organization"
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
  name?: string
  instructions?: string
  visibility?: "private" | "organization"
  access?: AutomationAccessInput
  type?: AutomationType
  trigger?: AutomationTriggerInput
}

export async function callJoriAutomationTool(
  ctx: ActionCtx,
  execution: {
    organizationId: string
    createdBy?: Id<"persons">
    automationId?: Id<"automations">
    automationConfigurationVersion?: number
  },
  request: JoriToolRequest
) {
  const args = readRecord(request.args)

  if (request.tool === "add_automation") {
    const { visibility, ...input } = args as AddAutomationArgs
    return await ctx.runMutation(internal.automations.records.create, {
      ...input,
      visibility:
        visibility === undefined ? undefined : visibilityFromInput(visibility),
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
    const { visibility, ...input } = args as UpdateAutomationArgs
    return await ctx.runMutation(internal.automations.records.update, {
      ...input,
      visibility:
        visibility === undefined ? undefined : visibilityFromInput(visibility),
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

  throw new Error(`Unknown Jori tool: ${request.tool}`)
}
