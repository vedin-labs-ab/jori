import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { executesAsOrganization } from "../../runs/principal"
import { type StoredVisibility } from "../../visibility/schema"
import { type JobType } from "../schema"
import { cancelTrigger } from "./trigger"

const cleanupBatchSize = 50

export async function deleteOwnedJobs(ctx: MutationCtx, parentId: Id<"jobs">) {
  const children = await ctx.db
    .query("jobs")
    .withIndex("by_parent", (index) => index.eq("parent.id", parentId))
    .take(cleanupBatchSize)

  for (const child of children) {
    await cancelTrigger(ctx, child.trigger)
    await ctx.db.delete(child._id)
  }

  if (children.length === cleanupBatchSize) {
    await ctx.scheduler.runAfter(0, internal.jobs.records.cleanupOwned, {
      parentId,
    })
  }
}

async function hasOwnedJobs(ctx: MutationCtx, parentId: Id<"jobs">) {
  return (
    (await ctx.db
      .query("jobs")
      .withIndex("by_parent", (index) => index.eq("parent.id", parentId))
      .first()) !== null
  )
}

export async function requireValidOwnershipUpdate(
  ctx: MutationCtx,
  args: { visibility?: StoredVisibility; type?: JobType },
  existing: Doc<"jobs">
) {
  if (
    existing.parent !== undefined &&
    ((args.type !== undefined && args.type !== "once") ||
      (args.visibility !== undefined &&
        executesAsOrganization(args.visibility) !==
          executesAsOrganization(existing.visibility)))
  ) {
    throw new Error("Owned one-time jobs cannot change type or sharing.")
  }

  if (
    existing.type !== "once" &&
    args.type === "once" &&
    (await hasOwnedJobs(ctx, existing._id))
  ) {
    throw new Error("Remove owned jobs before changing this type.")
  }
}

export async function hasInactiveParent(ctx: MutationCtx, job: Doc<"jobs">) {
  if (job.parent === undefined) {
    return false
  }

  const parent = await ctx.db.get(job.parent.id)

  return (
    parent === null ||
    parent.status !== "active" ||
    parent.type === "once" ||
    parent.organizationId !== job.organizationId ||
    (job.parent.version ?? 0) !== (parent.version ?? 1) ||
    !sameJobPrincipal(parent.principal, job.principal)
  )
}

export function sameJobPrincipal(
  left: Doc<"jobs">["principal"],
  right: Doc<"jobs">["principal"]
) {
  return (
    left.kind === right.kind &&
    (left.kind === "organization" ||
      (right.kind === "person" && left.personId === right.personId))
  )
}
