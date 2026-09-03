import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { resolveRunAudience } from "../../runs/audience"
import { startRun } from "../../runs/execution/workflow"
import { createJobRunSnapshot } from "../../runs/snapshot"

export async function createJobRun(
  ctx: MutationCtx,
  args: {
    job: Doc<"jobs">
    event?: Doc<"events"> | null
    integration?: Doc<"integrations"> | null
    cause: Doc<"runs">["cause"]
    now: number
  }
) {
  const runId = await ctx.db.insert("runs", {
    organizationId: args.job.organizationId,
    job: {
      id: args.job._id,
      parentId: args.job.parent?.id,
      version:
        args.job.parent === undefined
          ? (args.job.version ?? 1)
          : (args.job.parent.version ?? 0),
    },
    cause: args.cause,
    principal: args.job.principal,
    ...createJobRunSnapshot(args),
    ...(await resolveRunAudience(ctx, {
      origin: { job: args.job },
      run: { createdBy: args.job.createdBy },
    })),
    status: "queued",
    createdBy: args.job.createdBy,
    // Attribution is stamped once, here: what the run costs answers to the
    // folder the job was filed in when it fired, whatever happens to
    // the filing later.
    folderId: args.job.folderId,
    createdAt: args.now,
  })

  await ctx.db.patch(args.job._id, {
    firedAt: args.now,
    updatedAt: args.now,
  })
  await startRun(ctx, runId)

  return runId
}
