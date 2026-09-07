// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { type MutationCtx } from "./_generated/server"
import { preserveRows } from "./migration"
import schema from "./schema"

const modules = import.meta.glob("/convex/{_generated/**,migration}.{ts,js}")
afterEach(() => vi.unstubAllEnvs())

async function fixture() {
  const t = convexTest(schema, modules)
  const targets = await t.run(async (ctx) => {
    const personId = await ctx.db.insert("persons", {
      organizationId: "organization-1",
      createdAt: 100,
      updatedAt: 200,
    })
    const identityIds = []
    for (const externalId of ["auth-1", "email-1"]) {
      identityIds.push(
        await ctx.db.insert("identities", {
          organizationId: "organization-1",
          personId,
          provider: "auth",
          externalId,
          email: "fixture@example.com",
          name: "Fixture",
          link: { linkedAt: 123, method: "oauth", evidence: "preserved" },
          createdAt: 100,
          updatedAt: 200,
        })
      )
    }
    const skillIds = []
    for (const name of ["one", "two", "three", "four"]) {
      skillIds.push(
        await ctx.db.insert("skills", {
          organizationId: null,
          name,
          category: "communication",
          body: "Keep body",
          description: "Keep description",
          associatedIntegrations: ["slack"],
          communication: { parts: { intro: "Keep intro" } },
          createdAt: 100,
          updatedAt: 200,
        })
      )
    }
    return { identityIds, skillIds }
  })
  const snapshot = () =>
    t.run(async (ctx) => ({
      identities: await ctx.db.query("identities").take(3),
      skills: await ctx.db.query("skills").take(5),
    }))
  return { t, targets, snapshot }
}

test("dry-run preserves every field without writing", async () => {
  const { t, targets, snapshot } = await fixture()
  const before = await snapshot()
  expect(
    await t.run(async (ctx) => await preserveRows(ctx, targets, true))
  ).toEqual({ dryRun: true, identities: 2, skills: 4, alreadyApplied: false })
  expect(await snapshot()).toEqual(before)
})

test("renames six fields atomically, preserves content and timestamps, and is idempotent", async () => {
  const { t, targets, snapshot } = await fixture()
  const before = await snapshot()
  await t.run(async (ctx) => await preserveRows(ctx, targets, false))
  const after = await snapshot()
  expect(after.identities).toEqual(
    before.identities.map((row) => ({
      ...row,
      link: { at: 123, method: "oauth", evidence: "preserved" },
    }))
  )
  expect(after.skills).toEqual(
    before.skills.map((row) => {
      const { associatedIntegrations, ...rest } = row as typeof row & {
        associatedIntegrations: string[]
      }
      return { ...rest, surfaces: associatedIntegrations }
    })
  )
  expect(
    await t.run(async (ctx) => await preserveRows(ctx, targets, false))
  ).toMatchObject({ alreadyApplied: true })
  expect(await snapshot()).toEqual(after)
})

test("a changed target, row count, or partial migration aborts without writes", async () => {
  const { t, targets, snapshot } = await fixture()
  const before = await snapshot()
  await expect(
    t.run(
      async (ctx) =>
        await preserveRows(
          ctx,
          {
            ...targets,
            identityIds: [...targets.identityIds, ...targets.identityIds],
          },
          false
        )
    )
  ).rejects.toThrow("audited six targets")
  expect(await snapshot()).toEqual(before)
  await t.run(async (ctx) => {
    const identity = before.identities[0]
    if (!identity) {
      throw new Error("fixture missing")
    }
    await ctx.db.patch(identity._id, { link: { at: 123, method: "oauth" } })
  })
  const partial = await snapshot()
  await expect(
    t.run(async (ctx) => await preserveRows(ctx, targets, false))
  ).rejects.toThrow("partially migrated")
  expect(await snapshot()).toEqual(partial)
})

test("a write failure rolls back the whole six-record transaction", async () => {
  const { t, targets, snapshot } = await fixture()
  const before = await snapshot()
  await expect(
    t.run(async (ctx) => {
      const db = new Proxy(ctx.db, {
        get(target, key) {
          if (key === "replace") {
            return async () => {
              throw new Error("simulated write failure")
            }
          }
          return Reflect.get(target, key)
        },
      })
      return await preserveRows({ ...ctx, db } as MutationCtx, targets, false)
    })
  ).rejects.toThrow("simulated write failure")
  expect(await snapshot()).toEqual(before)
})

test.each([
  "extra",
  "tenant",
])("unexpected %s skill aborts without writes", async (change) => {
  const { t, targets, snapshot } = await fixture()
  await t.run(async (ctx) => {
    const skillId = targets.skillIds[0]
    if (!skillId) {
      throw new Error("fixture missing")
    }
    const row = await ctx.db.get(skillId)
    if (!row) {
      throw new Error("fixture missing")
    }
    if (change === "tenant") {
      await ctx.db.patch(row._id, { organizationId: "unexpected-tenant" })
    } else {
      const { _id, _creationTime, ...fields } = row
      await ctx.db.insert("skills", fields)
    }
  })
  const before = await snapshot()
  await expect(
    t.run(async (ctx) => await preserveRows(ctx, targets, false))
  ).rejects.toThrow(
    change === "tenant" ? "global skills" : "audited six targets"
  )
  expect(await snapshot()).toEqual(before)
})

test.each([
  ["eu", "https://insightful-goat-7.convex.cloud", "https://us.usejori.com"],
  ["us", "https://other.convex.cloud", "https://us.usejori.com"],
  ["us", "https://insightful-goat-7.convex.cloud", "https://eu.usejori.com"],
])("registered migration refuses crossed deployment identity %s %s %s", async (region, url, origin) => {
  vi.stubEnv("JORI_REGION", region)
  vi.stubEnv("CONVEX_CLOUD_URL", url)
  vi.stubEnv("JORI_APP_URL", origin)
  const t = convexTest(schema, modules)
  await expect(
    t.mutation(makeFunctionReference<"mutation">("migration:preserve"), {})
  ).rejects.toThrow("audited US deployment")
})

test("schema bridge keeps exact variants and rejects blended legacy/current fields", async () => {
  const { t, snapshot } = await fixture()
  const before = await snapshot()
  await expect(
    t.run(async (ctx) => {
      const row = before.identities[0]
      if (!row) {
        throw new Error("fixture missing")
      }
      await ctx.db.patch(row._id, {
        link: { at: 123, linkedAt: 123, method: "oauth" },
      })
    })
  ).rejects.toThrow()
  await expect(
    t.run(async (ctx) => {
      const row = before.skills[0]
      if (!row) {
        throw new Error("fixture missing")
      }
      await ctx.db.patch(row._id, { surfaces: ["slack"] })
    })
  ).rejects.toThrow()
  expect(await snapshot()).toEqual(before)
  expect(schema.schemaValidation).toBe(true)
})
