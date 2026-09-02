import { type Doc } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { optionalString } from "../../shared/input"

export const maxSearchResults = 100

export async function searchJobs(
  ctx: QueryCtx,
  args: {
    organizationId: string
    query?: string
    status?: Doc<"jobs">["status"]
    includeCompleted?: boolean
    limit?: number
  }
) {
  const limit = Math.min(args.limit ?? 25, maxSearchResults)
  const query = optionalString(args.query)?.toLowerCase()
  const jobs = await queryJobRows(ctx, args)

  return jobs
    .filter((job) => matchesQuery(job, query))
    .sort((left, right) => compareJobs(left, right))
    .slice(0, limit)
}

function queryJobRows(
  ctx: QueryCtx,
  args: {
    organizationId: string
    status?: Doc<"jobs">["status"]
    includeCompleted?: boolean
  }
) {
  const statusFilter =
    args.status ?? (args.includeCompleted === true ? undefined : "active")

  if (statusFilter !== undefined) {
    return ctx.db
      .query("jobs")
      .withIndex("by_organization_and_status_and_parent", (index) =>
        index
          .eq("organizationId", args.organizationId)
          .eq("status", statusFilter)
          .eq("parent.id", undefined)
      )
      .collect()
  }

  return ctx.db
    .query("jobs")
    .withIndex("by_organization_and_parent", (index) =>
      index.eq("organizationId", args.organizationId).eq("parent.id", undefined)
    )
    .collect()
}

function matchesQuery(job: Doc<"jobs">, query: string | undefined) {
  if (query === undefined) {
    return true
  }

  return (
    job.name.toLowerCase().includes(query) ||
    job.instructions.toLowerCase().includes(query)
  )
}

function compareJobs(left: Doc<"jobs">, right: Doc<"jobs">) {
  const leftRunAt = nextRunAt(left) ?? Number.POSITIVE_INFINITY
  const rightRunAt = nextRunAt(right) ?? Number.POSITIVE_INFINITY

  if (leftRunAt !== rightRunAt) {
    return leftRunAt - rightRunAt
  }

  return right.updatedAt - left.updatedAt
}

function nextRunAt(job: Doc<"jobs">) {
  if (job.type === "once" && "at" in job.trigger) {
    return job.trigger.at
  }

  if (job.type === "cron" && "nextAt" in job.trigger) {
    return job.trigger.nextAt
  }

  return undefined
}
