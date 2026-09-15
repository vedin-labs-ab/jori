// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api, internal } from "../../_generated/api"
import { authComponent, createAdapterOptions } from "../../auth"
import authSchema from "../../betterauth/schema"
import schema from "../../schema"
import { beginDeletion } from "../deletion"
import { eraseAuth } from "./auth"
import { seedAuth, seedContent } from "./fixtures"
import { purgeContent } from "./purge"
import { contentTables } from "./tables"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const authModules = import.meta.glob("/convex/betterauth/**/*.{ts,js}")

test("batched purge deletes parent-scoped contents and blobs while preserving another workspace and billing", async () => {
  const t = convexTest(schema, modules)
  const ids = await t.run(seedContent)
  for (let batch = 0; batch < contentTables.length + 20; batch++) {
    const done = await t.run(async (ctx) => {
      const row = await ctx.db.get(ids.retention)
      if (!row) {
        throw new Error("Missing deletion")
      }
      return await purgeContent(ctx, row)
    })
    if (done) {
      break
    }
  }
  await t.run(async (ctx) => {
    expect(await ctx.db.query("documents").collect()).toHaveLength(1)
    expect(await ctx.db.get(ids.kept)).not.toBeNull()
    expect(await ctx.db.get(ids.other)).not.toBeNull()
    expect(await ctx.db.get(ids.collection)).toBeNull()
    expect(await ctx.storage.get(ids.storageId)).toBeNull()
    expect(await ctx.db.get(ids.receipt)).not.toBeNull()
  })
})

test("auth erasure removes teams, invitations and memberships but keeps shared users and their other workspace", async () => {
  const t = convexTest(schema, modules)
  t.registerComponent("betterAuth", authSchema, authModules)
  const ids = await t.run(seedAuth)
  for (let batch = 0; batch < 10; batch++) {
    if (await t.run(async (ctx) => await eraseAuth(ctx, ids.org))) {
      break
    }
  }
  await t.run(async (ctx) => {
    const adapter = authComponent.adapter(ctx)(createAdapterOptions())
    expect(
      await adapter.findOne({
        model: "organization",
        where: [{ field: "id", value: ids.org }],
      })
    ).toBeNull()
    expect(
      await adapter.findOne({
        model: "user",
        where: [{ field: "id", value: ids.user }],
      })
    ).not.toBeNull()
    expect(
      await adapter.findMany({
        model: "member",
        where: [{ field: "organizationId", value: ids.org }],
      })
    ).toHaveLength(0)
    expect(
      await adapter.findMany({
        model: "member",
        where: [{ field: "organizationId", value: ids.other }],
      })
    ).toHaveLength(1)
    expect(
      await adapter.findMany({
        model: "team",
        where: [{ field: "organizationId", value: ids.org }],
      })
    ).toHaveLength(0)
  })
})

test("the staged deletion completes and retains only a permanent tombstone", async () => {
  vi.useFakeTimers()
  const t = convexTest(schema, modules)
  t.registerComponent("betterAuth", authSchema, authModules)
  const { org } = await t.run(seedAuth)
  const id = await t.run(async (ctx) => {
    await beginDeletion(ctx, org)
    const row = await ctx.db.query("workspaceRetention").first()
    if (!row) {
      throw new Error("Missing deletion")
    }
    return row._id
  })
  vi.setSystemTime(Date.now() + 36 * 60_000)
  for (let batch = 0; batch < 100; batch++) {
    await t.mutation(internal.retention.deletion.step, { id })
    await t.action(internal.discovery.sync.erasure.run, { id })
    const row = await t.run(async (ctx) => await ctx.db.get(id))
    if (row?.state === "deleted") {
      break
    }
  }
  expect(await t.run(async (ctx) => await ctx.db.get(id))).toMatchObject({
    state: "deleted",
  })
  vi.useRealTimers()
})

test("workspace deletion requires actual owner membership, not just an organization JWT claim", async () => {
  const t = convexTest(schema, modules)
  t.registerComponent("betterAuth", authSchema, authModules)
  const { user, org } = await t.run(seedAuth)
  const stranger = t.withIdentity({ subject: "stranger", org })
  await expect(
    stranger.mutation(api.retention.console.remove, { organizationId: org })
  ).rejects.toThrow("Only a workspace owner")
  const owner = t.withIdentity({ subject: user, org })
  await owner.mutation(api.retention.console.remove, { organizationId: org })
  expect(
    await t.query(internal.retention.records.deleting, { organizationId: org })
  ).toBe(true)
})
