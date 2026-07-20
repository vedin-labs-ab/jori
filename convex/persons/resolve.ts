import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { type Actor, actorValidator } from "../shared/actor"
import { canonicalPersonId } from "./data"
import { resolveIdentity } from "./identity/links"
import { type IdentityProvider, identityProvider } from "./identity/schema"

export async function resolveActor(
  ctx: MutationCtx,
  args: {
    organizationId: string
    provider: IdentityProvider
    actor: Actor | undefined
  }
): Promise<Id<"persons"> | undefined> {
  if (args.actor === undefined || args.actor.kind !== "person") {
    return undefined
  }

  if ("personId" in args.actor) {
    return await canonicalPersonId(ctx, args.actor.personId)
  }

  if ("externalId" in args.actor) {
    return await resolveIdentity(ctx, {
      organizationId: args.organizationId,
      provider: args.provider,
      externalId: args.actor.externalId,
      method: "observed",
      email: args.actor.email,
      name: args.actor.name,
    })
  }

  return await resolveIdentity(ctx, {
    organizationId: args.organizationId,
    provider: "email",
    externalId: args.actor.email,
    method: "email",
    email: args.actor.email,
  })
}

export const resolveActorRecord = internalMutation({
  args: {
    organizationId: v.string(),
    provider: identityProvider,
    actor: v.optional(actorValidator),
  },
  returns: v.union(v.id("persons"), v.null()),
  handler: async (ctx, args) => {
    return (
      (await resolveActor(ctx, {
        actor: args.actor,
        provider: args.provider,
        organizationId: args.organizationId,
      })) ?? null
    )
  },
})
