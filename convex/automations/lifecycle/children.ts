import { type Scope } from "../../../contracts/permissions/scope"
import { internal } from "../../_generated/api"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type AutomationType } from "../schema"
import { cancelTrigger } from "./trigger"

const cleanupBatchSize = 50

export async function deleteOwnedAutomations(
  ctx: MutationCtx,
  parentId: Id<"automations">
) {
  const children = await ctx.db
    .query("automations")
    .withIndex("by_parent", (index) => index.eq("parentId", parentId))
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
      .withIndex("by_parent", (index) => index.eq("parentId", parentId))
      .first()) !== null
  )
}

export async function requireValidOwnershipUpdate(
  ctx: MutationCtx,
  args: { scope?: Scope; type?: AutomationType },
  existing: Doc<"automations">
) {
  if (
    existing.parentId !== undefined &&
    ((args.type !== undefined && args.type !== "once") ||
      (args.scope !== undefined && args.scope !== existing.scope))
  ) {
    throw new Error("Owned one-time automations cannot change type or scope.")
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
  if (automation.parentId === undefined) {
    return false
  }

  const parent = await ctx.db.get(automation.parentId)

  return (
    parent === null ||
    parent.status !== "active" ||
    parent.type === "once" ||
    parent.tenantId !== automation.tenantId ||
    (automation.parentConfigurationVersion ?? 0) !==
      (parent.configurationVersion ?? 1) ||
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
