import { type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"

const canonicalDepthLimit = 16

type PersonCtx = MutationCtx | QueryCtx

export async function createPerson(
  ctx: MutationCtx,
  args: { tenantId: string; now?: number }
) {
  const now = args.now ?? Date.now()

  return await ctx.db.insert("persons", {
    tenantId: args.tenantId,
    createdAt: now,
    updatedAt: now,
  })
}

export async function canonicalPersonId(
  ctx: PersonCtx,
  personId: Id<"persons">
): Promise<Id<"persons">> {
  let current = personId
  const seen = new Set<Id<"persons">>()

  for (let depth = 0; depth < canonicalDepthLimit; depth += 1) {
    if (seen.has(current)) {
      return current
    }

    seen.add(current)
    const person = await ctx.db.get(current)

    if (person === null || person.supersededBy === undefined) {
      return current
    }

    current = person.supersededBy
  }

  return current
}

export async function canonicalPersonIds(
  ctx: PersonCtx,
  personIds: Id<"persons">[]
) {
  const canonicalIds = new Set<Id<"persons">>()

  for (const personId of personIds) {
    canonicalIds.add(await canonicalPersonId(ctx, personId))
  }

  return [...canonicalIds]
}
