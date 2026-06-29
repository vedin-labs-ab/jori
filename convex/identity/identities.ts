import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import { normalizeEmail } from "../persons/email"
import { linkIdentityToPerson } from "../persons/links"
import { identityProvider, linkMethod } from "./schema"

export type ProviderActorProfile = {
  email?: string
  name?: string
}

const providerActorProfile = v.object({
  email: v.optional(v.string()),
  name: v.optional(v.string()),
})

export async function resolveProviderActorProfile(
  ctx: QueryCtx | MutationCtx,
  args: {
    tenantId: string
    provider: Parameters<typeof linkIdentityToPerson>[1]["provider"]
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

export const linkProviderIdentity = internalMutation({
  args: {
    tenantId: v.string(),
    personId: v.id("persons"),
    provider: identityProvider,
    externalId: v.string(),
    method: linkMethod,
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  returns: v.id("persons"),
  handler: async (ctx, args) => {
    return await linkIdentityToPerson(ctx, args)
  },
})

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
