import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type QueryLikeCtx } from "../../shared/context"

export async function getOrganizationJob(
  ctx: QueryLikeCtx,
  organizationId: string,
  jobId: Id<"jobs">
) {
  const job = await ctx.db.get(jobId)

  if (job === null || job.organizationId !== organizationId) {
    throw new Error("Job not found.")
  }

  return job
}

export async function getRequiredJob(ctx: MutationCtx, jobId: Id<"jobs">) {
  const job = await ctx.db.get(jobId)

  if (job === null) {
    throw new Error("Job not found.")
  }

  return job
}
