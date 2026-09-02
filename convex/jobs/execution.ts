import { type Doc } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { sameJobPrincipal } from "./lifecycle/children"

/**
 * Job runs keep an immutable configuration generation. Tool access is
 * valid only while the durable job that owns that generation remains
 * current. Parent-owned one-time runs validate against their durable parent;
 * standalone one-time runs validate against their own retained history row.
 */
export async function canExecuteJobRunTools(
  ctx: QueryLikeCtx,
  run: Doc<"runs">
) {
  if (run.status !== "running") {
    return false
  }

  const snapshot = await resolveJobRunSnapshot(ctx, run)

  if (snapshot === null) {
    return true
  }

  const jobId = snapshot.job.parentId ?? snapshot.job.id
  const job = await ctx.db.get(jobId)

  if (
    job === null ||
    job.parent !== undefined ||
    job.organizationId !== run.organizationId ||
    !sameJobPrincipal(job.principal, run.principal) ||
    snapshot.job.version === undefined ||
    (job.version ?? 1) !== snapshot.job.version
  ) {
    return false
  }

  return isExecutableOwner(job, snapshot)
}

async function resolveJobRunSnapshot(
  ctx: QueryLikeCtx,
  run: Doc<"runs">
): Promise<JobRunSnapshot | null> {
  if (run.job !== undefined) {
    return { ...run, job: run.job }
  }

  const rootRunId = run.rootId ?? run.parentId

  if (rootRunId === undefined) {
    return null
  }

  const root = await ctx.db.get(rootRunId)

  return root?.job === undefined ? null : { ...root, job: root.job }
}

type JobRunSnapshot = Doc<"runs"> & {
  job: NonNullable<Doc<"runs">["job"]>
}

function isExecutableOwner(job: Doc<"jobs">, snapshot: JobRunSnapshot) {
  if (job.type !== "once") {
    return job.status === "active"
  }

  return (
    snapshot.job.parentId === undefined &&
    snapshot.job.id === job._id &&
    (job.status === "active" || job.status === "completed")
  )
}
