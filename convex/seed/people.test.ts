// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { createPerson } from "../persons/data"
import { linkIdentityToPerson } from "../persons/identity/links"
import schema from "../schema"
import { resolveOwner, resolveOwners, roster, seedRoster } from "./people"

const modules = import.meta.glob("/convex/{_generated,persons}/**/*.{ts,js}")

test("seeding keeps synthetic colleagues separate from signed-in accounts", async () => {
  const t = convexTest(schema, modules)
  const seed = { organizationId: "seed-organization", now: Date.now() }
  const ownerId = await t.run(async (ctx) => {
    const personId = await createPerson(ctx, seed)
    await linkIdentityToPerson(ctx, {
      organizationId: seed.organizationId,
      personId,
      provider: "auth",
      externalId: "signed-in-owner",
      method: "oauth",
      email: "owner@example.com",
    })
    return personId
  })

  await t.run((ctx) => seedRoster(ctx, seed))
  expect(await t.run((ctx) => seedRoster(ctx, seed))).toBe(0)
  expect(await t.run((ctx) => resolveOwner(ctx, seed))).toBe(ownerId)

  const colleagues = await t.run(async (ctx) => {
    const resolve = await resolveOwners(ctx, seed)
    return roster.map((person) => resolve(person.email.split("@")[0]))
  })
  expect(new Set(colleagues).size).toBe(roster.length)
  expect(colleagues).not.toContain(ownerId)

  const identities = await t.run((ctx) => ctx.db.query("identities").collect())
  for (const identity of identities.filter((row) => row.personId !== ownerId)) {
    expect(identity.email).toMatch(/\.example$/)
    if (identity.provider !== "email") {
      expect(identity.externalId).toMatch(/^seed-/)
    }
  }
})
