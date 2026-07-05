import { type Id } from "../_generated/dataModel"
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

// The canonical actor for an observed one: resolve the identity the ingest
// path already recorded, follow person merges, and pick the best name across
// the person's identities. The personId rides along so derived data keeps a
// re-resolvable key rather than a collapsed display string; both fall back
// to the actor's own display name when nothing resolves. Read-only by
// design — observation never creates identities here.
export async function canonicalActor(
  ctx: QueryLikeCtx,
  args: {
    tenantId: string
    provider: IdentityProvider | undefined
    actor: Actor | undefined
  }
): Promise<{ name: string; personId?: Id<"persons"> } | undefined> {
  const fallback = getActorDisplayName(args.actor)
  const actor = args.actor

  if (
    actor === undefined ||
    actor.kind !== "person" ||
    args.provider === undefined ||
    !("externalId" in actor)
  ) {
    return fallback === undefined ? undefined : { name: fallback }
  }

  const identity = await findIdentity(ctx, {
    tenantId: args.tenantId,
    provider: args.provider,
    externalId: actor.externalId,
  })

  if (identity === null) {
    return fallback === undefined ? undefined : { name: fallback }
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
      return { name, personId }
    }
  }

  return fallback === undefined
    ? { name: actor.externalId, personId }
    : { name: fallback, personId }
}
