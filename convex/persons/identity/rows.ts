import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type QueryLikeCtx } from "../../shared/context"
import { normalizeEmail } from "../email"
import { type IdentityProvider, type LinkMethod } from "./schema"

const methodRank = {
  observed: 0,
  email: 1,
  oauth: 2,
  manual: 3,
} satisfies Record<LinkMethod, number>

export type IdentityProfile = { email?: string; name?: string }

export async function findIdentity(
  ctx: QueryLikeCtx,
  args: {
    tenantId: string
    provider: IdentityProvider
    externalId: string
  }
) {
  return await ctx.db
    .query("identities")
    .withIndex("by_tenant_provider_external_id", (index) =>
      index
        .eq("tenantId", args.tenantId)
        .eq("provider", args.provider)
        .eq("externalId", args.externalId)
    )
    .first()
}

export async function insertIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
    personId: Id<"persons">
    provider: IdentityProvider
    externalId: string
    method: LinkMethod
    evidence?: string
    profile: IdentityProfile
  }
) {
  const now = Date.now()

  await ctx.db.insert("identities", {
    tenantId: args.tenantId,
    personId: args.personId,
    provider: args.provider,
    externalId: args.externalId,
    ...args.profile,
    link: linkValue(args.method, now, args.evidence),
    createdAt: now,
    updatedAt: now,
  })
}

export async function patchIdentity(
  ctx: MutationCtx,
  existing: Doc<"identities">,
  args: {
    personId: Id<"persons">
    externalId: string
    method: LinkMethod
    email?: string
    name?: string
    evidence?: string
  }
) {
  const shouldReplaceLink = outranksOrEquals(args.method, existing.link.method)
  const now = Date.now()

  await ctx.db.patch(existing._id, {
    personId: args.personId,
    externalId: args.externalId,
    ...normalizeProfile(args),
    ...(shouldReplaceLink
      ? { link: linkValue(args.method, now, args.evidence) }
      : {}),
    updatedAt: now,
  })
}

export function outranks(left: LinkMethod, right: LinkMethod) {
  return methodRank[left] > methodRank[right]
}

// Pick the survivor from candidate persons by link-method precedence, so
// observation can never supersede a proven identity. Pass one entry per person;
// ties keep the first candidate, so callers should pass a stable order.
export function selectSurvivor(
  candidates: { personId: Id<"persons">; method: LinkMethod }[]
) {
  let survivor: { personId: Id<"persons">; method: LinkMethod } | undefined

  for (const candidate of candidates) {
    if (survivor === undefined || outranks(candidate.method, survivor.method)) {
      survivor = candidate
    }
  }

  return survivor?.personId
}

export function normalizeExternalId(
  provider: IdentityProvider,
  externalId: string
) {
  const normalized =
    provider === "email" ? normalizeEmail(externalId) : externalId.trim()

  if (normalized === undefined || normalized === "") {
    throw new Error("Identity external ID is required.")
  }

  return normalized
}

export function normalizeProfile(profile: IdentityProfile): IdentityProfile {
  const email = normalizeEmail(profile.email)
  const name = normalizeText(profile.name)

  return {
    ...(email === undefined ? {} : { email }),
    ...(name === undefined ? {} : { name }),
  }
}

function outranksOrEquals(left: LinkMethod, right: LinkMethod) {
  return methodRank[left] >= methodRank[right]
}

function normalizeText(value: string | undefined) {
  const trimmed = value?.trim()

  return trimmed === undefined || trimmed === "" ? undefined : trimmed
}

function linkValue(method: LinkMethod, linkedAt: number, evidence?: string) {
  return {
    method,
    linkedAt,
    ...(evidence === undefined || evidence === "" ? {} : { evidence }),
  }
}
