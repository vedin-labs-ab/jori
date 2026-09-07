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
import { readUserProfile, requireUserId } from "../access/users"
import { type QueryLikeCtx } from "../shared/context"
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

/** The account-person shape of an identity: how a signed-in caller maps to
 *  a person row. Every materialization site must build it the same way. */
export function accountArgs(
  identity: Parameters<typeof readUserProfile>[0],
  organizationId: string
) {
  return {
    organizationId,
    userId: requireUserId(identity),
    ...readUserProfile(identity),
  }
}

export async function ensureCurrentPerson(
  ctx: MutationCtx,
  organizationId: string
) {
  const identity = await requireOrganizationAccess(ctx, organizationId)

  return await ensureAccountPerson(ctx, accountArgs(identity, organizationId))
}

export async function ensureCurrentPersonFromAction(
  ctx: ActionCtx,
  organizationId: string
) {
  const identity = await requireOrganizationAccess(ctx, organizationId)

  return await ctx.runMutation(
    internal.persons.account.ensure,
    accountArgs(identity, organizationId)
  )
}

/** The caller's person, or nothing while their identity is still
 *  syncing; authenticate in the handler before resolving it here. */
export async function resolveConsolePerson(
  ctx: QueryLikeCtx,
  organizationId: string,
  identity: Parameters<typeof readUserProfile>[0]
) {
  return await resolvePersonByIdentity(ctx, {
    organizationId,
    provider: "auth",
    externalId: requireUserId(identity),
  })
}

export async function resolveCurrentPerson(
  ctx: QueryCtx,
  organizationId: string
) {
  const identity = await requireOrganizationAccess(ctx, organizationId)
  const personId = await resolveConsolePerson(ctx, organizationId, identity)

  if (personId === undefined) {
    throw new Error("Your Jori identity is still syncing. Refresh shortly.")
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
    const account = accountArgs(identity, args.organizationId)
    const personId = await ensureAccountPerson(ctx, account)

    if (args.timezone !== undefined) {
      await updatePersonTimezone(ctx, personId, args.timezone)
    }

    if (account.email !== undefined) {
      await linkIdentityToPerson(ctx, {
        organizationId: args.organizationId,
        personId,
        provider: "email",
        externalId: account.email,
        method: "oauth",
        email: account.email,
      })
    }

    return null
  },
})
