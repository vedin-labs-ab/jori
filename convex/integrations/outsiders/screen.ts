import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../../_generated/server"
import {
  type IdentityProvider,
  identityProvider,
} from "../../persons/identity/schema"
import { findMember } from "../../persons/member"
import { resolveActor } from "../../persons/resolve"
import { insertRow } from "../../retention/write"
import {
  type Actor,
  actorValidator,
  getActorExternalId,
  isExternalActor,
} from "../../shared/actor"
import { type OutsiderAttempt, outsiderAttempt } from "./schema"

type Screening = {
  integration: Doc<"integrations">
  provider: IdentityProvider
  actor?: Actor
  /** What the writer tried; absent when replaying history, which notes
   *  nothing. */
  attempt?: OutsiderAttempt
  conversationId?: string
}

/** The one gate between a provider's writers and Jori. A member comes back
 *  as their person, with this identity linked; an outsider comes back
 *  undefined, noted in the audit trail, and must get nothing further. */
export async function screenWriter(
  ctx: MutationCtx,
  args: Screening
): Promise<Id<"persons"> | undefined> {
  const member = await findMember(ctx, {
    organizationId: args.integration.organizationId,
    provider: args.provider,
    actor: args.actor,
  })

  if (member === undefined) {
    await noteOutsider(ctx, args)
    return undefined
  }

  return await resolveActor(ctx, {
    organizationId: args.integration.organizationId,
    provider: args.provider,
    actor: args.actor,
  })
}

export const screen = internalMutation({
  args: {
    integrationId: v.id("integrations"),
    provider: identityProvider,
    actor: v.optional(actorValidator),
    attempt: outsiderAttempt,
    conversationId: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, { integrationId, ...args }) => {
    const integration = await ctx.db.get(integrationId)

    return (
      integration !== null &&
      (await screenWriter(ctx, { ...args, integration })) !== undefined
    )
  },
})

async function noteOutsider(ctx: MutationCtx, args: Screening) {
  const externalId = getActorExternalId(args.actor)

  if (externalId === undefined || args.attempt === undefined) {
    return
  }

  const now = Date.now()
  const last = {
    attempt: args.attempt,
    conversationId: args.conversationId,
    at: now,
  }
  const existing = await ctx.db
    .query("outsiders")
    .withIndex("by_integration_and_external", (index) =>
      index
        .eq("integrationId", args.integration._id)
        .eq("externalId", externalId)
    )
    .unique()

  if (existing !== null) {
    await ctx.db.patch(existing._id, {
      attempts: existing.attempts + 1,
      last,
    })
    return
  }

  await insertRow(ctx, "outsiders", {
    organizationId: args.integration.organizationId,
    integrationId: args.integration._id,
    externalId,
    ...(args.actor !== undefined && "name" in args.actor
      ? { name: args.actor.name }
      : {}),
    ...(isExternalActor(args.actor) ? { external: true } : {}),
    attempts: 1,
    last,
    createdAt: now,
  })
}
