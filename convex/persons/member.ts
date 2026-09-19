import { type Id } from "../_generated/dataModel"
import { authComponent, createAdapterOptions } from "../auth"
import { type Actor, isExternalActor } from "../shared/actor"
import { type QueryLikeCtx } from "../shared/context"
import { canonicalPersonId } from "./data"
import { emailIdentities } from "./identity/matching"
import { findIdentity, normalizeExternalId } from "./identity/rows"
import { type IdentityProvider } from "./identity/schema"

const identityLimit = 25

/** The member behind an observed actor, or undefined for an outsider: a
 *  writer the provider places outside the installed workspace, or one whose
 *  identity and verified email reach no member of the organization. It only
 *  reads, so asking the question never links or merges anyone. */
export async function findMember(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    provider: IdentityProvider
    actor: Actor | undefined
  }
): Promise<Id<"persons"> | undefined> {
  const actor = args.actor

  if (
    actor === undefined ||
    actor.kind !== "person" ||
    isExternalActor(actor)
  ) {
    return undefined
  }

  for (const candidate of await candidatePersons(ctx, { ...args, actor })) {
    const personId = await canonicalPersonId(ctx, candidate)

    if (
      await isMember(ctx, { organizationId: args.organizationId, personId })
    ) {
      return personId
    }
  }

  return undefined
}

async function candidatePersons(
  ctx: QueryLikeCtx,
  args: { organizationId: string; provider: IdentityProvider; actor: Actor }
): Promise<Id<"persons">[]> {
  if ("personId" in args.actor) {
    return [args.actor.personId]
  }

  const linked =
    "externalId" in args.actor
      ? await findIdentity(ctx, {
          organizationId: args.organizationId,
          provider: args.provider,
          externalId: normalizeExternalId(args.provider, args.actor.externalId),
        })
      : null
  const sameEmail = await emailIdentities(
    ctx,
    args.organizationId,
    args.actor.email
  )

  return [...(linked === null ? [] : [linked]), ...sameEmail].map(
    (identity) => identity.personId
  )
}

/** Membership is the live Better Auth row, so removing someone from the
 *  organization ends their standing on every surface at once. */
export async function isMember(
  ctx: QueryLikeCtx,
  args: { organizationId: string; personId: Id<"persons"> }
) {
  const adapter = authComponent.adapter(ctx)(createAdapterOptions())

  for (const userId of await loadAuthUserIds(ctx, args)) {
    const member = await adapter.findOne<{ userId: string }>({
      model: "member",
      where: [
        { field: "organizationId", value: args.organizationId },
        { field: "userId", value: userId },
      ],
    })

    if (member) {
      return true
    }
  }

  return false
}

/** The Better Auth user ids linked to a person in this organization. */
export async function loadAuthUserIds(
  ctx: QueryLikeCtx,
  args: { organizationId: string; personId: Id<"persons"> }
): Promise<string[]> {
  const identities = await ctx.db
    .query("identities")
    .withIndex("by_person", (index) => index.eq("personId", args.personId))
    .take(identityLimit)

  return identities
    .filter(
      (identity) =>
        identity.provider === "auth" &&
        identity.organizationId === args.organizationId
    )
    .map((identity) => identity.externalId)
}
