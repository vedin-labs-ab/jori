import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type QueryLikeCtx } from "../shared/context"

const canonicalDepthLimit = 16

export async function createPerson(
  ctx: MutationCtx,
  args: { organizationId: string; now?: number }
) {
  const now = args.now ?? Date.now()

  return await ctx.db.insert("persons", {
    organizationId: args.organizationId,
    createdAt: now,
    updatedAt: now,
  })
}

export async function canonicalPersonId(
  ctx: QueryLikeCtx,
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
