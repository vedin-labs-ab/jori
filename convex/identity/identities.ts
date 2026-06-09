import { type MutationCtx, type QueryCtx } from "../_generated/server"

export type IdentityProvider = "google" | "microsoft"

export async function upsertIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
    userId: string
    provider: IdentityProvider
    providerAccountId: string
    externalUserId: string
    email?: string
  }
) {
  const now = Date.now()
  const email = normalizeEmail(args.email)
  const existing = await ctx.db
    .query("identities")
    .withIndex("by_tenant_provider_external_user", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("provider", args.provider)
        .eq("externalUserId", args.externalUserId)
    )
    .first()

  if (existing === null) {
    return await ctx.db.insert("identities", {
      tenantId: args.tenantId,
      userId: args.userId,
      provider: args.provider,
      providerAccountId: args.providerAccountId,
      externalUserId: args.externalUserId,
      email,
      createdAt: now,
      updatedAt: now,
    })
  }

  await ctx.db.patch(existing._id, {
    userId: args.userId,
    providerAccountId: args.providerAccountId,
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
