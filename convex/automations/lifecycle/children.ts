import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { executesAsOrganization } from "../../runs/principal"
import { type StoredVisibility } from "../../visibility/schema"
import { type AutomationType } from "../schema"
import { cancelTrigger } from "./trigger"

const cleanupBatchSize = 50

export async function deleteOwnedAutomations(
  ctx: MutationCtx,
  parentId: Id<"automations">
) {
  const children = await ctx.db
    .query("automations")
    .withIndex("by_parent", (index) => index.eq("parent.id", parentId))
    .take(cleanupBatchSize)

  for (const child of children) {
    await cancelTrigger(ctx, child.trigger)
    await ctx.db.delete(child._id)
  }

  if (children.length === cleanupBatchSize) {
    await ctx.scheduler.runAfter(0, internal.automations.records.cleanupOwned, {
      parentId,
    })
  }
}

export async function hasOwnedAutomations(
  ctx: MutationCtx,
  parentId: Id<"automations">
) {
  return (
    (await ctx.db
      .query("automations")
      .withIndex("by_parent", (index) => index.eq("parent.id", parentId))
      .first()) !== null
  )
}

export async function requireValidOwnershipUpdate(
  ctx: MutationCtx,
  args: { visibility?: StoredVisibility; type?: AutomationType },
  existing: Doc<"automations">
) {
  if (
    existing.parent !== undefined &&
    ((args.type !== undefined && args.type !== "once") ||
      (args.visibility !== undefined &&
        executesAsOrganization(args.visibility) !==
          executesAsOrganization(existing.visibility)))
  ) {
    throw new Error("Owned one-time automations cannot change type or sharing.")
  }

  if (
    existing.type !== "once" &&
    args.type === "once" &&
    (await hasOwnedAutomations(ctx, existing._id))
  ) {
    throw new Error("Remove owned automations before changing this type.")
  }
}

export async function hasInactiveParent(
  ctx: MutationCtx,
  automation: Doc<"automations">
) {
  if (automation.parent === undefined) {
    return false
  }

  const parent = await ctx.db.get(automation.parent.id)

  return (
    parent === null ||
    parent.status !== "active" ||
    parent.type === "once" ||
    parent.organizationId !== automation.organizationId ||
    (automation.parent.version ?? 0) !== (parent.version ?? 1) ||
    !sameAutomationPrincipal(parent.principal, automation.principal)
  )
}

export function sameAutomationPrincipal(
  left: Doc<"automations">["principal"],
  right: Doc<"automations">["principal"]
) {
  return (
    left.kind === right.kind &&
    (left.kind === "organization" ||
      (right.kind === "person" && left.personId === right.personId))
  )
}
