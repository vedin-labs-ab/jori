import { type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { createPerson } from "../persons/data"
import { linkIdentityToPerson } from "../persons/identity/links"
import { type Actor } from "../shared/actor"
import { daysAgo, type SeedContext } from "./context"

// This roster is synthetic, not a company directory. Reserved email domains
// and seed-prefixed provider IDs keep fixtures separate from real identities.
// Everyone is reached by email elsewhere in the seed. Whoever actually
// signed in to this deployment keeps their own person row and stays the
// organization's owner; the seed only adds colleagues around them.

type SeedIdentity = {
  provider: "github" | "linear" | "slack"
  externalId: string
}

type SeedPerson = {
  name: string
  email: string
  /** Days before the seed instant that this person joined. */
  joined: number
  identities: SeedIdentity[]
}

export const roster: SeedPerson[] = [
  {
    name: "Mia Lindqvist",
    email: "mia@vedinlabs.example",
    joined: 402,
    identities: [{ provider: "slack", externalId: "seed-slack-mia" }],
  },
  {
    name: "Oskar Hedlund",
    email: "oskar@vedinlabs.example",
    joined: 388,
    identities: [
      { provider: "slack", externalId: "seed-slack-oskar" },
      { provider: "github", externalId: "seed-github-oskar" },
      {
        provider: "linear",
        externalId: "seed-linear-oskar",
      },
    ],
  },
  {
    name: "Nadia Rahman",
    email: "nadia@vedinlabs.example",
    joined: 271,
    identities: [
      { provider: "slack", externalId: "seed-slack-nadia" },
      { provider: "github", externalId: "seed-github-nadia" },
      {
        provider: "linear",
        externalId: "seed-linear-nadia",
      },
    ],
  },
  {
    name: "Tobias Ek",
    email: "tobias@vedinlabs.example",
    joined: 214,
    identities: [{ provider: "slack", externalId: "seed-slack-tobias" }],
  },
  {
    name: "Priya Iyer",
    email: "priya@vedinlabs.example",
    joined: 163,
    identities: [{ provider: "slack", externalId: "seed-slack-priya" }],
  },
  {
    name: "Johan Sandström",
    email: "johan@vedinlabs.example",
    joined: 128,
    identities: [{ provider: "slack", externalId: "seed-slack-johan" }],
  },
  {
    name: "Elin Byström",
    email: "elin@vedinlabs.example",
    joined: 74,
    identities: [
      { provider: "slack", externalId: "seed-slack-elin" },
      { provider: "github", externalId: "seed-github-elin" },
    ],
  },
]

/** Writes every colleague who is not already present. Re-running is safe:
 *  a person already carrying one of these emails is reused, so the seed keeps
 *  one row per colleague however many times it runs. */
export async function seedRoster(ctx: MutationCtx, seed: SeedContext) {
  const existing = await resolvePeople(ctx, seed)
  let written = 0

  for (const person of roster) {
    const personId =
      existing.get(person.email) ??
      (await createPerson(ctx, {
        organizationId: seed.organizationId,
        now: daysAgo(seed, person.joined, 9),
      }))

    written += existing.has(person.email) ? 0 : 1

    for (const identity of person.identities) {
      await linkIdentityToPerson(ctx, {
        organizationId: seed.organizationId,
        personId,
        provider: identity.provider,
        externalId: identity.externalId,
        method: "observed",
        email: person.email,
        name: person.name,
        evidence: "Seeded workspace directory",
      })
    }
  }

  return written
}

/** The person the organization answers to: whoever holds a real sign-in.
 *  Falls back to the longest-serving seeded colleague so a deployment nobody
 *  has signed in to still has an owner to attribute rows to. */
export async function resolveOwner(
  ctx: QueryCtx,
  seed: SeedContext
): Promise<Id<"persons">> {
  const identities = await ctx.db
    .query("identities")
    .withIndex("by_organization_email", (index) =>
      index.eq("organizationId", seed.organizationId)
    )
    .collect()
  const account = identities.find((identity) => identity.provider === "auth")

  if (account !== undefined) {
    return account.personId
  }

  const founder = identities.find(
    (identity) => identity.email === roster[0].email
  )

  if (founder === undefined) {
    throw new Error("Seed the people stage before stages that attribute rows.")
  }

  return founder.personId
}

/** Everyone the seed has already written, keyed by email. */
export async function resolvePeople(ctx: QueryCtx, seed: SeedContext) {
  const identities = await ctx.db
    .query("identities")
    .withIndex("by_organization_email", (index) =>
      index.eq("organizationId", seed.organizationId)
    )
    .collect()
  const people = new Map<string, Id<"persons">>()

  for (const identity of identities) {
    if (identity.email !== undefined && !people.has(identity.email)) {
      people.set(identity.email, identity.personId)
    }
  }

  return people
}

/** The roster keyed by the local part of each address, which is how the
 *  fixtures name people: `oskar`, not `oskar@vedinlabs.example`. */
const rosterByHandle = new Map(
  roster.map((person) => [person.email.split("@")[0], person])
)

export function requireSeedPerson(handle: string) {
  const person = rosterByHandle.get(handle)

  if (person === undefined) {
    throw new Error(`No seeded person is called ${handle}.`)
  }

  return person
}

/** How a seeded colleague appears as the author of an observed Slack
 *  message: the workspace's own user id, with the profile it carries. */
export function slackActor(handle: string): Actor {
  const person = requireSeedPerson(handle)
  const slack = person.identities.find(
    (identity) => identity.provider === "slack"
  )

  if (slack === undefined) {
    throw new Error(`${handle} has no seeded Slack identity.`)
  }

  return {
    kind: "person",
    externalId: slack.externalId,
    name: person.name,
    email: person.email,
  }
}

/** Resolves a fixture's owner handle to a person, falling back to whoever
 *  the organization answers to. Material is owned by the person who would
 *  actually keep it, so a console list does not read as one person's
 *  workspace. */
export async function resolveOwners(ctx: QueryCtx, seed: SeedContext) {
  const people = await resolvePeople(ctx, seed)
  const account = await resolveOwner(ctx, seed)

  return (handle: string | undefined) =>
    people.get(`${handle}@vedinlabs.example`) ?? account
}
