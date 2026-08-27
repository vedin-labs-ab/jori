import { type Doc } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { type Integration, integrationLabels } from "../shared/integrations"
import {
  type AutomationAccess,
  automationScope,
  resolveToolAccessLevel,
} from "./access"

export async function toAutomationDisplay(
  ctx: QueryLikeCtx,
  automation: Doc<"automations">
) {
  return {
    id: automation._id,
    key: automation.key,
    playbook: automation.playbook,
    name: automation.name,
    instructions: automation.instructions,
    scope: automationScope(automation),
    type: automation.type,
    status: automation.status,
    trigger: await projectTrigger(ctx, automation),
    access: await projectAccess(ctx, automation.access),
    createdAt: automation.createdAt,
    updatedAt: automation.updatedAt,
    firedAt: automation.firedAt,
  }
}

async function projectAccess(ctx: QueryLikeCtx, access: AutomationAccess) {
  const surfaces: Array<{
    integration: Integration
    access: "both" | "read" | "write"
    tools: string[]
  }> = []

  for (const entry of access.integrations) {
    const integration = await ctx.db.get(entry.id)

    if (integration === null) {
      continue
    }

    const level = resolveToolAccessLevel(entry.tools)

    if (level !== "none") {
      surfaces.push({
        integration: integration.integration,
        access: level,
        tools: entry.tools,
      })
    }
  }

  return {
    webSearch: access.web,
    surfaces: surfaces.sort((left, right) =>
      integrationLabels[left.integration].localeCompare(
        integrationLabels[right.integration]
      )
    ),
  }
}

async function projectTrigger(
  ctx: QueryLikeCtx,
  automation: Doc<"automations">
) {
  const trigger = automation.trigger

  if (automation.type !== "event" || !("integrationId" in trigger)) {
    return trigger
  }

  const integration = await ctx.db.get(trigger.integrationId)

  return {
    integration: integration?.integration,
    event: trigger.event,
    match: trigger.match,
  }
}
