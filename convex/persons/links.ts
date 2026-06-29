import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { type IdentityProvider, type LinkMethod } from "../identity/schema"
import { canonicalPersonId, createPerson } from "./data"
import { normalizeEmail } from "./email"
import { convergeByEmail, findEmailTarget } from "./matching"
import { mergePersons } from "./merge"
import {
  findIdentity,
  type IdentityProfile,
  insertIdentity,
  normalizeExternalId,
  normalizeProfile,
  outranks,
  patchIdentity,
} from "./rows"

type PersonCtx = MutationCtx | QueryCtx

export async function resolveIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
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
    tenantId: args.tenantId,
  })

  if (existing !== null) {
    const personId = await canonicalPersonId(ctx, existing.personId)
    await patchIdentity(ctx, existing, { ...args, externalId, personId })
    return await convergeByEmail(ctx, {
      email: profile.email,
      personId,
      tenantId: args.tenantId,
    })
  }

  const target =
    (await findEmailTarget(ctx, args.tenantId, profile.email)) ??
    (await createPerson(ctx, { tenantId: args.tenantId }))

  return await linkIdentityToPerson(ctx, {
    ...args,
    externalId,
    personId: target,
  })
}

export async function linkIdentityToPerson(
  ctx: MutationCtx,
  args: {
    tenantId: string
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
    tenantId: args.tenantId,
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

  return await convergeByEmail(ctx, {
    email: profile.email,
    personId,
    tenantId: args.tenantId,
  })
}

export async function resolvePersonByIdentity(
  ctx: PersonCtx,
  args: {
    tenantId: string
    provider: IdentityProvider
    externalId: string
  }
) {
  const identity = await findIdentity(ctx, {
    tenantId: args.tenantId,
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
    tenantId: string
    personId: Id<"persons">
    method: LinkMethod
  }
) {
  const existingPersonId = await canonicalPersonId(ctx, existing.personId)

  if (existingPersonId === args.personId) {
    return args.personId
  }

  const [sourcePersonId, targetPersonId] = outranks(
    args.method,
    existing.link.method
  )
    ? [existingPersonId, args.personId]
    : [args.personId, existingPersonId]

  return await mergePersons(ctx, {
    sourcePersonId,
    targetPersonId,
    tenantId: args.tenantId,
  })
}

async function ensureEmailIdentity(
  ctx: MutationCtx,
  args: {
    tenantId: string
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
    tenantId: args.tenantId,
    personId: args.personId,
    provider: "email",
    externalId: email,
    method: args.method === "observed" ? "email" : args.method,
    email,
    name: args.profile.name,
  })
}
