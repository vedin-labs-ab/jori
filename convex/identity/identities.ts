import { type MutationCtx, type QueryCtx } from "../_generated/server"

export type IdentityProvider = "google" | "microsoft"

export async function upsertIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
    userId: string
    provider: IdentityProvider
    accountId: string
    externalId: string
    email?: string
  }
) {
  const now = Date.now()
  const email = normalizeEmail(args.email)
  const existing = await ctx.db
    .query("identities")
    .withIndex("by_tenant_provider_external_id", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("provider", args.provider)
        .eq("externalId", args.externalId)
    )
    .first()

  if (existing === null) {
    return await ctx.db.insert("identities", {
      tenantId: args.tenantId,
      userId: args.userId,
      provider: args.provider,
      accountId: args.accountId,
      externalId: args.externalId,
      email,
      createdAt: now,
      updatedAt: now,
    })
  }

  await ctx.db.patch(existing._id, {
    userId: args.userId,
    accountId: args.accountId,
    email,
    updatedAt: now,
  })

  return existing._id
}

export async function resolveUserIdByEmail(
  ctx: QueryCtx | MutationCtx,
  args: {
    tenantId: string
    email: string | undefined
  }
) {
  const email = normalizeEmail(args.email)

  if (email === undefined) {
    return undefined
  }

  const identityLimit = 100
  const identities = await ctx.db
    .query("identities")
    .withIndex("by_tenant_email", (query) =>
      query.eq("tenantId", args.tenantId).eq("email", email)
    )
    .take(identityLimit)

  if (identities.length === identityLimit) {
    return undefined
  }

  const userIds = new Set(identities.map((identity) => identity.userId))

  if (userIds.size !== 1) {
    return undefined
  }

  return [...userIds][0]
}

export function normalizeEmail(email: string | undefined) {
  const normalized = email?.trim().toLowerCase()

  return normalized === "" ? undefined : normalized
}
