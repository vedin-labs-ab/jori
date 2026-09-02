import { type Doc } from "../_generated/dataModel"
import { executesAsOrganization } from "../runs/principal"
import { type QueryLikeCtx } from "../shared/context"
import { type Integration, integrationLabels } from "../shared/integrations"
import { type JobAccess, resolveToolAccessLevel } from "./access"

export async function toJobDisplay(ctx: QueryLikeCtx, job: Doc<"jobs">) {
  return {
    id: job._id,
    key: job.key,
    name: job.name,
    instructions: job.instructions,
    // Two-way facet the console filters by; visibility carries the detail.
    audience: executesAsOrganization(job.visibility)
      ? ("organization" as const)
      : ("personal" as const),
    visibility: job.visibility,
    type: job.type,
    status: job.status,
    folderId: job.folderId,
    trigger: await projectTrigger(ctx, job),
    access: await projectAccess(ctx, job.access),
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    firedAt: job.firedAt,
  }
}

async function projectAccess(ctx: QueryLikeCtx, access: JobAccess) {
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

async function projectTrigger(ctx: QueryLikeCtx, job: Doc<"jobs">) {
  const trigger = job.trigger

  if (job.type !== "event" || !("integrationId" in trigger)) {
    return trigger
  }

  const integration = await ctx.db.get(trigger.integrationId)

  return {
    integration: integration?.integration,
    event: trigger.event,
    match: trigger.match,
  }
}
