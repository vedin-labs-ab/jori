// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { expect, test, vi } from "vitest"
import { storage } from "../../../../contracts/billing"
import {
  retentionClock,
  retentionTest as setup,
} from "../../../../test/convex/materials/retention"
import { internal } from "../../../_generated/api"
import { seedAuth } from "../../../retention/erasure/fixtures"
import { usageBucket } from "../meter"
import { requireUsage, seedAccount, seedFile, seedNotice } from "./fixtures"

retentionClock()
const gb = storage.bytesPerGb
const sweep = internal.files.capacity.retention.sweep.workspace

test.each(["queued", "failed"] as const)(
  "%s owner notice cannot start retention or delete files",
  async (status) => {
    const t = setup()
    const file = await t.run(async (ctx) => {
      await seedAccount(ctx)
      const file = await seedFile(ctx, { size: 26 * gb, createdAt: 1 })
      const row = await requireUsage(ctx)
      await ctx.db.patch(row._id, {
        overCapacityNoticeId: await seedNotice(ctx, "org", status),
        overCapacityRetryAt: Date.now() + storage.graceMs,
      })
      return file
    })
    await t.mutation(sweep, { organizationId: "org" })
    await t.run(async (ctx) => {
      expect((await usageBucket(ctx, "org"))?.overCapacityAt).toBeUndefined()
      expect(await ctx.db.get(file.fileId)).not.toBeNull()
    })
  }
)

test("no owner email fails closed without starting a deadline", async () => {
  const t = setup()
  await t.run(async (ctx) => {
    await seedAccount(ctx)
    await seedFile(ctx, { size: 26 * gb, createdAt: 1 })
  })
  await t.mutation(sweep, { organizationId: "org" })
  await t.run(async (ctx) => {
    const row = await requireUsage(ctx)
    expect(row?.overCapacityAt).toBeUndefined()
    expect(row?.overCapacityNoticeId).toBeUndefined()
    expect(row?.overCapacityRetryAt).toBeGreaterThan(Date.now())
    expect(await ctx.db.query("files").collect()).toHaveLength(1)
  })
})

test("another workspace's accepted email cannot authorize a deletion deadline", async () => {
  const t = setup()
  await t.run(async (ctx) => {
    await seedAccount(ctx)
    await seedFile(ctx, { size: 26 * gb, createdAt: 1 })
    const row = await requireUsage(ctx)
    await ctx.db.patch(row._id, {
      overCapacityNoticeId: await seedNotice(ctx, "other"),
    })
  })
  await t.mutation(sweep, { organizationId: "org" })
  await t.run(async (ctx) => {
    expect((await requireUsage(ctx)).overCapacityAt).toBeUndefined()
  })
})

test("the owner notice is queued once and does not start grace before acceptance", async () => {
  const t = setup()
  vi.stubEnv("JORI_APP_URL", "https://eu.usejori.com")
  const { org } = await t.run(seedAuth)
  await t.run(async (ctx) => {
    await seedAccount(ctx, org)
    await seedFile(ctx, { organizationId: org, size: 26 * gb, createdAt: 1 })
  })
  await t.mutation(sweep, { organizationId: org })
  await t.mutation(sweep, { organizationId: org })
  await t.run(async (ctx) => {
    const submissions = await ctx.db.query("emailSubmissions").collect()
    expect(submissions).toHaveLength(1)
    expect(submissions[0]).toMatchObject({
      status: "queued",
      organizationId: org,
      region: "eu",
      message: { to: "owner@example.com" },
    })
    expect(submissions[0]?.message?.text).toContain("newest files first")
    expect((await usageBucket(ctx, org))?.overCapacityAt).toBeUndefined()
  })
})

test("late acceptance starts a full 30-day grace and repeats do not extend it", async () => {
  const t = setup()
  const startedAt = Date.now()
  await t.run(async (ctx) => {
    await seedAccount(ctx)
    await seedFile(ctx, { size: 26 * gb, createdAt: 1 })
    const row = await requireUsage(ctx)
    await ctx.db.patch(row._id, {
      overCapacityNoticeId: await seedNotice(ctx),
    })
  })
  await t.mutation(sweep, { organizationId: "org" })
  vi.setSystemTime(startedAt + storage.graceMs - 1)
  await t.mutation(sweep, { organizationId: "org" })
  await t.run(async (ctx) => {
    expect((await usageBucket(ctx, "org"))?.overCapacityAt).toBe(startedAt)
    expect(await ctx.db.query("files").collect()).toHaveLength(1)
  })
})
