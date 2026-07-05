import { type IdentityProvider } from "../identity/schema"
import { type Actor, getActorDisplayName } from "../shared/actor"
import { type QueryLikeCtx } from "../shared/context"
import { canonicalPersonId } from "./data"
import { findIdentity } from "./rows"

// Display-name preference across a person's linked identities: chat and doc
// directories carry human names, code forges carry handles.
const namePreference: IdentityProvider[] = [
  "slack",
  "notion",
  "linear",
  "github",
  "email",
]

// The canonical display name for an observed actor: resolve the identity the
// ingest path already recorded, follow person merges, and pick the best name
// across the person's identities. Falls back to the actor's own display name
// when nothing resolves. Read-only by design — observation never creates
// identities here.
export async function canonicalActorName(
  ctx: QueryLikeCtx,
  args: {
    tenantId: string
    provider: IdentityProvider | undefined
    actor: Actor | undefined
  }
): Promise<string | undefined> {
  const fallback = getActorDisplayName(args.actor)
  const actor = args.actor

  if (
    actor === undefined ||
    actor.kind !== "person" ||
    args.provider === undefined ||
    !("externalId" in actor)
  ) {
    return fallback
  }

  const identity = await findIdentity(ctx, {
    tenantId: args.tenantId,
    provider: args.provider,
    externalId: actor.externalId,
  })

  if (identity === null) {
    return fallback
  }

  const personId = await canonicalPersonId(ctx, identity.personId)
  const identities = await ctx.db
    .query("identities")
    .withIndex("by_person", (index) => index.eq("personId", personId))
    .collect()

  for (const provider of namePreference) {
    const name = identities.find(
      (row) => row.provider === provider && row.name !== undefined
    )?.name

    if (name !== undefined) {
      return name
    }
  }

  return fallback
}
