import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type QueryLikeCtx } from "../../shared/context"
import { canonicalPersonId, createPerson } from "../data"
import { normalizeEmail } from "../email"
import { mergeWinner } from "../merge"
import { convergeEmail } from "./matching"
import {
  findIdentity,
  type IdentityProfile,
  insertIdentity,
  normalizeExternalId,
  normalizeProfile,
  patchIdentity,
} from "./rows"
import { type IdentityProvider, type LinkMethod } from "./schema"

export async function resolveIdentity(
  ctx: MutationCtx,
  args: {
    organizationId: string
    provider: IdentityProvider
    externalId: string
    method: LinkMethod
    email?: string
    name?: string
  }
) {
  const externalId = normalizeExternalId(args.provider, args.externalId)
  const profile = normalizeProfile(args)
  const existing = await findIdentity(ctx, {
    externalId,
    provider: args.provider,
    organizationId: args.organizationId,
  })

  if (existing !== null) {
    const personId = await canonicalPersonId(ctx, existing.personId)
    await patchIdentity(ctx, existing, { ...args, externalId, personId })
    return (
      (await convergeEmail(ctx, args.organizationId, profile.email)) ?? personId
    )
  }

  const target =
    (await convergeEmail(ctx, args.organizationId, profile.email)) ??
    (await createPerson(ctx, { organizationId: args.organizationId }))

  return await linkIdentityToPerson(ctx, {
    ...args,
    externalId,
    personId: target,
  })
}

export async function linkIdentityToPerson(
  ctx: MutationCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    provider: IdentityProvider
    externalId: string
    method: LinkMethod
    email?: string
    name?: string
    evidence?: string
  }
) {
  const externalId = normalizeExternalId(args.provider, args.externalId)
  const profile = normalizeProfile(args)
  const requestedPersonId = await canonicalPersonId(ctx, args.personId)
  const existing = await findIdentity(ctx, {
    externalId,
    provider: args.provider,
    organizationId: args.organizationId,
  })
  const personId =
    existing === null
      ? requestedPersonId
      : await resolveLinkConflict(ctx, existing, {
          ...args,
          personId: requestedPersonId,
        })

  if (existing === null) {
    await insertIdentity(ctx, { ...args, externalId, personId, profile })
  } else {
    await patchIdentity(ctx, existing, { ...args, externalId, personId })
  }

  await ensureEmailIdentity(ctx, { ...args, personId, profile })

  return (
    (await convergeEmail(ctx, args.organizationId, profile.email)) ?? personId
  )
}

export async function resolvePersonByIdentity(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    provider: IdentityProvider
    externalId: string
  }
) {
  const identity = await findIdentity(ctx, {
    organizationId: args.organizationId,
    provider: args.provider,
    externalId: normalizeExternalId(args.provider, args.externalId),
  })

  return identity === null
    ? undefined
    : await canonicalPersonId(ctx, identity.personId)
}

async function resolveLinkConflict(
  ctx: MutationCtx,
  existing: Doc<"identities">,
  args: {
    organizationId: string
    personId: Id<"persons">
    method: LinkMethod
  }
) {
  const existingPersonId = await canonicalPersonId(ctx, existing.personId)

  if (existingPersonId === args.personId) {
    return args.personId
  }

  return (
    (await mergeWinner(ctx, args.organizationId, [
      { personId: existingPersonId, method: existing.link.method },
      { personId: args.personId, method: args.method },
    ])) ?? args.personId
  )
}

async function ensureEmailIdentity(
  ctx: MutationCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    provider: IdentityProvider
    method: LinkMethod
    profile: IdentityProfile
  }
) {
  const email = normalizeEmail(args.profile.email)

  if (email === undefined || args.provider === "email") {
    return
  }

  await linkIdentityToPerson(ctx, {
    organizationId: args.organizationId,
    personId: args.personId,
    provider: "email",
    externalId: email,
    method: args.method === "observed" ? "email" : args.method,
    email,
    name: args.profile.name,
  })
}
