import { type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { canonicalPersonId, canonicalPersonIds } from "./data"
import { identifyingEmail } from "./email"
import { mergePersons } from "./merge"

const emailPersonLimit = 5

type PersonCtx = MutationCtx | QueryCtx

export async function findEmailTarget(
  ctx: MutationCtx,
  tenantId: string,
  email: string | undefined
) {
  const personIds = await readEmailPersonIds(ctx, tenantId, email)

  if (personIds.length === 0) {
    return undefined
  }

  const target = personIds[0]

  for (const personId of personIds.slice(1)) {
    await mergePersons(ctx, {
      sourcePersonId: personId,
      targetPersonId: target,
      tenantId,
    })
  }

  return target
}

export async function convergeByEmail(
  ctx: MutationCtx,
  args: {
    tenantId: string
    personId: Id<"persons">
    email: string | undefined
  }
) {
  const personIds = await readEmailPersonIds(ctx, args.tenantId, args.email)
  let target = await canonicalPersonId(ctx, args.personId)

  for (const personId of personIds) {
    if (personId !== target) {
      target = await mergePersons(ctx, {
        sourcePersonId: personId,
        targetPersonId: target,
        tenantId: args.tenantId,
      })
    }
  }

  return target
}

async function readEmailPersonIds(
  ctx: PersonCtx,
  tenantId: string,
  email: string | undefined
) {
  const normalized = identifyingEmail(email)

  if (normalized === undefined) {
    return []
  }

  const identities = await ctx.db
    .query("identities")
    .withIndex("by_tenant_email", (index) =>
      index.eq("tenantId", tenantId).eq("email", normalized)
    )
    .take(emailPersonLimit + 1)

  if (identities.length > emailPersonLimit) {
    return []
  }

  return await canonicalPersonIds(
    ctx,
    identities.map((identity) => identity.personId)
  )
}
