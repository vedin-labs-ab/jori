import { type Id } from "../_generated/dataModel"
import { type IdentityProvider } from "../identity/schema"
import { type Actor } from "../shared/actor"
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

// The canonical person behind an observed actor, or undefined when the graph
// holds no identity for it (bots, unmapped providers). Read-only by design —
// observation never creates identities here; the ingest path already did.
export async function resolvePersonId(
  ctx: QueryLikeCtx,
  args: {
    tenantId: string
    provider: IdentityProvider | undefined
    actor: Actor | undefined
  }
): Promise<Id<"persons"> | undefined> {
  const actor = args.actor

  if (
    actor === undefined ||
    actor.kind !== "person" ||
    args.provider === undefined ||
    !("externalId" in actor)
  ) {
    return undefined
  }

  const identity = await findIdentity(ctx, {
    tenantId: args.tenantId,
    provider: args.provider,
    externalId: actor.externalId,
  })

  return identity === null
    ? undefined
    : await canonicalPersonId(ctx, identity.personId)
}

// The best display name across a person's identities, preference-ordered,
// falling back to any named identity. Undefined only for a person with no
// named identity at all.
export async function personDisplayName(
  ctx: QueryLikeCtx,
  personId: Id<"persons">
): Promise<string | undefined> {
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

  return identities.find((row) => row.name !== undefined)?.name
}
