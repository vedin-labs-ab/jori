import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { canonicalPersonId } from "./data"
import { outranks, selectSurvivor } from "./identity/rows"
import { type LinkMethod } from "./identity/schema"

const identityBatchSize = 100

async function mergePersons(
  ctx: MutationCtx,
  args: {
    sourcePersonId: Id<"persons">
    targetPersonId: Id<"persons">
    organizationId: string
  }
) {
  const sourcePersonId = await canonicalPersonId(ctx, args.sourcePersonId)
  const targetPersonId = await canonicalPersonId(ctx, args.targetPersonId)

  if (sourcePersonId === targetPersonId) {
    return targetPersonId
  }

  const source = await ctx.db.get(sourcePersonId)
  const target = await ctx.db.get(targetPersonId)

  if (
    source === null ||
    target === null ||
    source.organizationId !== args.organizationId ||
    target.organizationId !== args.organizationId
  ) {
    throw new Error("Cannot merge persons across organizations.")
  }

  await moveIdentityBatch(
    ctx,
    args.organizationId,
    sourcePersonId,
    targetPersonId
  )
  await ctx.db.patch(sourcePersonId, {
    supersededBy: targetPersonId,
    updatedAt: Date.now(),
  })
  await scheduleIdentityRewrite(ctx, {
    sourcePersonId,
    targetPersonId,
    organizationId: args.organizationId,
  })

  return targetPersonId
}

// The one place merge direction is decided. Converge candidate persons into a
// single survivor chosen by link-method precedence, so observation can never
// supersede a proven identity. Returns the survivor, or undefined when empty.
export async function mergeWinner(
  ctx: MutationCtx,
  organizationId: string,
  candidates: { personId: Id<"persons">; method: LinkMethod }[]
): Promise<Id<"persons"> | undefined> {
  const strongest = new Map<Id<"persons">, LinkMethod>()

  for (const candidate of candidates) {
    const personId = await canonicalPersonId(ctx, candidate.personId)
    const current = strongest.get(personId)

    if (current === undefined || outranks(candidate.method, current)) {
      strongest.set(personId, candidate.method)
    }
  }

  const deduped = [...strongest].map(([personId, method]) => ({
    personId,
    method,
  }))
  const survivor = selectSurvivor(deduped)

  if (survivor === undefined) {
    return undefined
  }

  for (const { personId } of deduped) {
    if (personId !== survivor) {
      await mergePersons(ctx, {
        sourcePersonId: personId,
        targetPersonId: survivor,
        organizationId,
      })
    }
  }

  return survivor
}

export const rewritePersonIdentities = internalMutation({
  args: {
    organizationId: v.string(),
    sourcePersonId: v.id("persons"),
    targetPersonId: v.id("persons"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const moved = await moveIdentityBatch(
      ctx,
      args.organizationId,
      args.sourcePersonId,
      args.targetPersonId
    )

    if (moved === identityBatchSize) {
      await scheduleIdentityRewrite(ctx, args)
    }

    return null
  },
})

async function moveIdentityBatch(
  ctx: MutationCtx,
  organizationId: string,
  sourcePersonId: Id<"persons">,
  targetPersonId: Id<"persons">
) {
  const identities = await ctx.db
    .query("identities")
    .withIndex("by_person", (index) => index.eq("personId", sourcePersonId))
    .take(identityBatchSize)

  const now = Date.now()

  for (const identity of identities) {
    if (identity.organizationId === organizationId) {
      await ctx.db.patch(identity._id, {
        personId: targetPersonId,
        updatedAt: now,
      })
    }
  }

  return identities.length
}

async function scheduleIdentityRewrite(
  ctx: MutationCtx,
  args: {
    organizationId: string
    sourcePersonId: Id<"persons">
    targetPersonId: Id<"persons">
  }
) {
  await ctx.scheduler.runAfter(
    0,
    internal.persons.merge.rewritePersonIdentities,
    args
  )
}
