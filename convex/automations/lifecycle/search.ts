import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"

export const maxSearchResults = 100

export async function searchAutomations(
  ctx: QueryCtx,
  args: {
    organizationId: string
    query?: string
    status?: Doc<"automations">["status"]
    includeCompleted?: boolean
    limit?: number
  }
) {
  const limit = Math.min(args.limit ?? 25, maxSearchResults)
  const query = args.query?.trim().toLowerCase()
  const automations = await queryAutomationRows(ctx, args)

  return automations
    .filter((automation) => matchesQuery(automation, query))
    .sort((left, right) => compareAutomations(left, right))
    .slice(0, limit)
}

function queryAutomationRows(
  ctx: QueryCtx,
  args: {
    organizationId: string
    status?: Doc<"automations">["status"]
    includeCompleted?: boolean
  }
) {
  const statusFilter =
    args.status ?? (args.includeCompleted === true ? undefined : "active")

  if (statusFilter !== undefined) {
    return ctx.db
      .query("automations")
      .withIndex("by_organization_and_status_and_parent", (index) =>
        index
          .eq("organizationId", args.organizationId)
          .eq("status", statusFilter)
          .eq("parentId", undefined)
      )
      .collect()
  }

  return ctx.db
    .query("automations")
    .withIndex("by_organization_and_parent", (index) =>
      index.eq("organizationId", args.organizationId).eq("parentId", undefined)
    )
    .collect()
}

function matchesQuery(
  automation: Doc<"automations">,
  query: string | undefined
) {
  if (query === undefined || query === "") {
    return true
  }

  return (
    automation.name.toLowerCase().includes(query) ||
    automation.instructions.toLowerCase().includes(query)
  )
}

function compareAutomations(
  left: Doc<"automations">,
  right: Doc<"automations">
) {
  const leftRunAt = nextRunAt(left) ?? Number.POSITIVE_INFINITY
  const rightRunAt = nextRunAt(right) ?? Number.POSITIVE_INFINITY

  if (leftRunAt !== rightRunAt) {
    return leftRunAt - rightRunAt
  }

  return right.updatedAt - left.updatedAt
}

function nextRunAt(automation: Doc<"automations">) {
  if (automation.type === "once" && "at" in automation.trigger) {
    return automation.trigger.at
  }

  if (automation.type === "cron" && "nextAt" in automation.trigger) {
    return automation.trigger.nextAt
  }

  return undefined
}
