import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import {
  type ActionCtx,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "../access/users"
import {
  linkIdentityToPerson,
  resolveIdentity,
  resolvePersonByIdentity,
} from "./identity/links"
import { updatePersonTimezone } from "./profile/timezone"

const verifiedClerkEmailValidator = v.object({
  externalId: v.string(),
  email: v.string(),
})

type ClerkProfile = {
  email?: string
  name?: string
}

export async function ensureCurrentPerson(
  ctx: MutationCtx,
  organizationId: string
) {
  const identity = await requireOrganizationAccess(ctx, organizationId)

  return await ensureClerkPerson(ctx, {
    organizationId,
    clerkSubject: requireClerkUserId(identity),
    email: readClerkUserEmail(identity),
    name: readClerkUserName(identity),
  })
}

export async function ensureCurrentPersonFromAction(
  ctx: ActionCtx,
  organizationId: string
) {
  const identity = await requireOrganizationAccess(ctx, organizationId)

  return await ctx.runMutation(internal.persons.clerk.ensure, {
    organizationId,
    clerkSubject: requireClerkUserId(identity),
    email: readClerkUserEmail(identity),
    name: readClerkUserName(identity),
  })
}

export async function resolveCurrentPerson(
  ctx: QueryCtx,
  organizationId: string
) {
  const identity = await requireOrganizationAccess(ctx, organizationId)
  const personId = await resolvePersonByIdentity(ctx, {
    organizationId,
    provider: "clerk",
    externalId: requireClerkUserId(identity),
  })

  if (personId === undefined) {
    throw new Error("Your Milo identity is still syncing. Refresh shortly.")
  }

  return personId
}

export async function ensureClerkPerson(
  ctx: MutationCtx,
  args: {
    organizationId: string
    clerkSubject: string
  } & ClerkProfile
) {
  return await resolveIdentity(ctx, {
    organizationId: args.organizationId,
    provider: "clerk",
    externalId: args.clerkSubject,
    method: "oauth",
    email: args.email,
    name: args.name,
  })
}

export const ensure = internalMutation({
  args: {
    organizationId: v.string(),
    clerkSubject: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  returns: v.id("persons"),
  handler: async (ctx, args) => {
    return await ensureClerkPerson(ctx, args)
  },
})

export const sync = internalMutation({
  args: {
    organizationId: v.string(),
    clerkSubject: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    emails: v.array(verifiedClerkEmailValidator),
    timezone: v.optional(v.string()),
  },
  returns: v.object({
    personId: v.id("persons"),
    synced: v.number(),
  }),
  handler: async (ctx, args) => {
    const personId = await ensureClerkPerson(ctx, args)

    if (args.timezone !== undefined) {
      await updatePersonTimezone(ctx, personId, args.timezone)
    }

    for (const email of args.emails) {
      await linkVerifiedEmail(ctx, args.organizationId, personId, email.email)
    }

    return { personId, synced: args.emails.length }
  },
})

async function linkVerifiedEmail(
  ctx: MutationCtx,
  organizationId: string,
  personId: Id<"persons">,
  email: string
) {
  await linkIdentityToPerson(ctx, {
    organizationId,
    personId,
    provider: "email",
    externalId: email,
    method: "oauth",
    email,
  })
}
