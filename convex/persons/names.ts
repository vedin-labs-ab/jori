import { type Id } from "../_generated/dataModel"
import { authComponent } from "../auth"
import { type Actor } from "../shared/actor"
import { type QueryLikeCtx } from "../shared/context"
import { canonicalPersonId } from "./data"
import { findIdentity } from "./identity/rows"
import { type IdentityProvider } from "./identity/schema"

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
    organizationId: string
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
    organizationId: args.organizationId,
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

  return preferredPersonName(identities)
}

/** Name plus avatar for showing a person in the console. The avatar is the
 *  image the sign-in provider (Google, Microsoft) gave Better Auth, reached
 *  through the person's linked auth identity — people known only through
 *  observed integrations have none and render as initials. */
export async function personDisplay(
  ctx: QueryLikeCtx,
  personId: Id<"persons">
): Promise<{ name?: string; image?: string }> {
  const identities = await ctx.db
    .query("identities")
    .withIndex("by_person", (index) => index.eq("personId", personId))
    .collect()
  const account = identities.find((row) => row.provider === "auth")
  const user =
    account === undefined
      ? null
      : await authComponent.getAnyUserById(ctx, account.externalId)

  return {
    name: preferredPersonName(identities),
    image: user?.image ?? undefined,
  }
}

export async function withOwnerDisplay<Row extends { ownerId?: Id<"persons"> }>(
  ctx: QueryLikeCtx,
  row: Row
) {
  const [display] = await withOwnerDisplays(ctx, [row])
  return display
}

/** Console rows with their owner's display attached, resolved once per
 *  distinct person rather than once per row: a listing is usually a
 *  handful of people over many rows, and every lookup reads that person's
 *  identities and linked account. A row no person owns keeps an absent
 *  name, which the console reads as Jori's own work. */
export async function withOwnerDisplays<
  Row extends { ownerId?: Id<"persons"> },
>(ctx: QueryLikeCtx, rows: Row[]) {
  const displays = new Map<Id<"persons">, { name?: string; image?: string }>()

  for (const ownerId of new Set(rows.map((row) => row.ownerId))) {
    if (ownerId !== undefined) {
      displays.set(ownerId, await personDisplay(ctx, ownerId))
    }
  }

  return rows.map((row) => {
    const display =
      row.ownerId === undefined ? undefined : displays.get(row.ownerId)

    return { ...row, ownerName: display?.name, ownerImage: display?.image }
  })
}

export function preferredPersonName(
  identities: Array<{ name?: string; provider: IdentityProvider }>
) {
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
