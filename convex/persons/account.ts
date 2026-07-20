import { v } from "convex/values"
import { internal } from "../_generated/api"
import {
  type ActionCtx,
  internalMutation,
  type MutationCtx,
  mutation,
  type QueryCtx,
} from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { readUserEmail, readUserName, requireUserId } from "../access/users"
import {
  linkIdentityToPerson,
  resolveIdentity,
  resolvePersonByIdentity,
} from "./identity/links"
import { updatePersonTimezone } from "./profile/timezone"

type AccountProfile = {
  email?: string
  name?: string
}

export async function ensureCurrentPerson(
  ctx: MutationCtx,
  organizationId: string
) {
  const identity = await requireOrganizationAccess(ctx, organizationId)

  return await ensureAccountPerson(ctx, {
    organizationId,
    userId: requireUserId(identity),
    email: readUserEmail(identity),
    name: readUserName(identity),
  })
}

export async function ensureCurrentPersonFromAction(
  ctx: ActionCtx,
  organizationId: string
) {
  const identity = await requireOrganizationAccess(ctx, organizationId)

  return await ctx.runMutation(internal.persons.account.ensure, {
    organizationId,
    userId: requireUserId(identity),
    email: readUserEmail(identity),
    name: readUserName(identity),
  })
}

export async function resolveCurrentPerson(
  ctx: QueryCtx,
  organizationId: string
) {
  const identity = await requireOrganizationAccess(ctx, organizationId)
  const personId = await resolvePersonByIdentity(ctx, {
    organizationId,
    provider: "auth",
    externalId: requireUserId(identity),
  })

  if (personId === undefined) {
    throw new Error("Your Milo identity is still syncing. Refresh shortly.")
  }

  return personId
}

export async function ensureAccountPerson(
  ctx: MutationCtx,
  args: {
    organizationId: string
    userId: string
  } & AccountProfile
) {
  return await resolveIdentity(ctx, {
    organizationId: args.organizationId,
    provider: "auth",
    externalId: args.userId,
    method: "oauth",
    email: args.email,
    name: args.name,
  })
}

export const ensure = internalMutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  returns: v.id("persons"),
  handler: async (ctx, args) => {
    return await ensureAccountPerson(ctx, args)
  },
})

/** Console session bootstrap: materializes the signed-in member as a person,
 *  records their timezone, and links their verified sign-in email so observed
 *  integration identities converge on the same person. */
export const sync = mutation({
  args: {
    organizationId: v.string(),
    timezone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const email = readUserEmail(identity)
    const personId = await ensureAccountPerson(ctx, {
      organizationId: args.organizationId,
      userId: requireUserId(identity),
      email,
      name: readUserName(identity),
    })

    if (args.timezone !== undefined) {
      await updatePersonTimezone(ctx, personId, args.timezone)
    }

    if (email !== undefined) {
      await linkIdentityToPerson(ctx, {
        organizationId: args.organizationId,
        personId,
        provider: "email",
        externalId: email,
        method: "oauth",
        email,
      })
    }

    return null
  },
})
