import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import {
  type ActionCtx,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import {
  readClerkUserEmail,
  readClerkUserName,
  requireClerkUserId,
} from "../identity/users"
import {
  linkIdentityToPerson,
  resolveIdentity,
  resolvePersonByIdentity,
} from "./links"
import { updatePersonTimezone } from "./timezone"

const verifiedClerkEmailValidator = v.object({
  externalId: v.string(),
  email: v.string(),
})

type ClerkProfile = {
  email?: string
  name?: string
}

export async function ensureCurrentPerson(ctx: MutationCtx, tenantId: string) {
  const identity = await requireTenantAccess(ctx, tenantId)

  return await ensureClerkPerson(ctx, {
    tenantId,
    clerkSubject: requireClerkUserId(identity),
    email: readClerkUserEmail(identity),
    name: readClerkUserName(identity),
  })
}

export async function ensureCurrentPersonFromAction(
  ctx: ActionCtx,
  tenantId: string
) {
  const identity = await requireTenantAccess(ctx, tenantId)

  return await ctx.runMutation(internal.persons.clerk.ensure, {
    tenantId,
    clerkSubject: requireClerkUserId(identity),
    email: readClerkUserEmail(identity),
    name: readClerkUserName(identity),
  })
}

export async function resolveCurrentPerson(ctx: QueryCtx, tenantId: string) {
  const identity = await requireTenantAccess(ctx, tenantId)
  const personId = await resolvePersonByIdentity(ctx, {
    tenantId,
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
    tenantId: string
    clerkSubject: string
  } & ClerkProfile
) {
  return await resolveIdentity(ctx, {
    tenantId: args.tenantId,
    provider: "clerk",
    externalId: args.clerkSubject,
    method: "oauth",
    email: args.email,
    name: args.name,
  })
}

export const ensure = internalMutation({
  args: {
    tenantId: v.string(),
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
    tenantId: v.string(),
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
      await linkVerifiedEmail(ctx, args.tenantId, personId, email.email)
    }

    return { personId, synced: args.emails.length }
  },
})

async function linkVerifiedEmail(
  ctx: MutationCtx,
  tenantId: string,
  personId: Id<"persons">,
  email: string
) {
  await linkIdentityToPerson(ctx, {
    tenantId,
    personId,
    provider: "email",
    externalId: email,
    method: "oauth",
    email,
  })
}
