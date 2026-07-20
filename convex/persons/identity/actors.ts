import { v } from "convex/values"
import { internalQuery } from "../../_generated/server"
import { type QueryLikeCtx } from "../../shared/context"
import { normalizeEmail } from "../email"
import { type linkIdentityToPerson } from "./links"
import { identityProvider } from "./schema"

export type ProviderActorProfile = {
  email?: string
  name?: string
}

const providerActorProfile = v.object({
  email: v.optional(v.string()),
  name: v.optional(v.string()),
})

export async function resolveProviderActorProfile(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    provider: Parameters<typeof linkIdentityToPerson>[1]["provider"]
    externalId: string
  }
): Promise<ProviderActorProfile | undefined> {
  const identity = await ctx.db
    .query("identities")
    .withIndex("by_organization_provider_external_id", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("provider", args.provider)
        .eq("externalId", args.externalId)
    )
    .first()

  return identity === null ? undefined : normalizeProviderActorProfile(identity)
}

export const resolveProviderActorProfileRecord = internalQuery({
  args: {
    organizationId: v.string(),
    provider: identityProvider,
    externalId: v.string(),
  },
  returns: v.union(providerActorProfile, v.null()),
  handler: async (ctx, args) => {
    return (await resolveProviderActorProfile(ctx, args)) ?? null
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
