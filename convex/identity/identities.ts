import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import { type IdentityProvider, identityProvider } from "./schema"

export type ProviderActorProfile = {
  email?: string
  name?: string
}

const providerActorProfile = v.object({
  email: v.optional(v.string()),
  name: v.optional(v.string()),
})

export async function upsertIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
    userId: string
    provider: IdentityProvider
    externalId: string
    email?: string
    name?: string
  }
) {
  const now = Date.now()
  const profile = normalizeProviderActorProfile(args) ?? {}
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
      externalId: args.externalId,
      ...profile,
      createdAt: now,
      updatedAt: now,
    })
  }

  await ctx.db.patch(existing._id, {
    userId: args.userId,
    ...profile,
    updatedAt: now,
  })

  return existing._id
}

export async function resolveProviderActorProfile(
  ctx: QueryCtx | MutationCtx,
  args: {
    tenantId: string
    provider: IdentityProvider
    externalId: string
  }
): Promise<ProviderActorProfile | undefined> {
  const identity = await ctx.db
    .query("identities")
    .withIndex("by_tenant_provider_external_id", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("provider", args.provider)
        .eq("externalId", args.externalId)
    )
    .first()

  return identity === null ? undefined : normalizeProviderActorProfile(identity)
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

export const resolveProviderActorProfileRecord = internalQuery({
  args: {
    tenantId: v.string(),
    provider: identityProvider,
    externalId: v.string(),
  },
  returns: v.union(providerActorProfile, v.null()),
  handler: async (ctx, args) => {
    return (await resolveProviderActorProfile(ctx, args)) ?? null
  },
})

export const resolveUserIdByEmailRecord = internalQuery({
  args: {
    tenantId: v.string(),
    email: v.optional(v.string()),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    return (
      (await resolveUserIdByEmail(ctx, {
        tenantId: args.tenantId,
        email: args.email,
      })) ?? null
    )
  },
})

export const upsertProviderIdentity = internalMutation({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    provider: identityProvider,
    externalId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  returns: v.id("identities"),
  handler: async (ctx, args) => {
    return await upsertIdentity(ctx, args)
  },
})

export function normalizeEmail(email: string | undefined) {
  const normalized = email?.trim().toLowerCase()

  return normalized === "" ? undefined : normalized
}

function normalizeProviderActorProfile(args: {
  email?: string
  name?: string
}): ProviderActorProfile | undefined {
  const email = normalizeEmail(args.email)
  const name = normalizeProfileText(args.name)

  if (email === undefined && name === undefined) {
    return undefined
  }

  return {
    ...(email === undefined ? {} : { email }),
    ...(name === undefined ? {} : { name }),
  }
}

function normalizeProfileText(value: string | undefined) {
  const trimmed = value?.trim()

  return trimmed === undefined || trimmed === "" ? undefined : trimmed
}
