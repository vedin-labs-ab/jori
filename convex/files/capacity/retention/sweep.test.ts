// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { expect, test, vi } from "vitest"
import { storage } from "../../../../contracts/billing"
import {
  retentionClock,
  retentionTest as setup,
} from "../../../../test/convex/materials/retention"
import { internal } from "../../../_generated/api"
import { blobExists } from "../../blobs/fixtures"
import { usageBucket } from "../meter"
import { requireUsage, seedAccount, seedFile, seedNotice } from "./fixtures"

retentionClock()
const gb = storage.bytesPerGb
const sweep = internal.files.capacity.retention.sweep.workspace

test("expiry deletes only enough newest files, their blobs and shares, once", async () => {
  const t = setup()
  const ids = await t.run(async (ctx) => {
    await seedAccount(ctx)
    const oldest = await seedFile(ctx, { size: 24 * gb, createdAt: 1 })
    const middle = await seedFile(ctx, { size: gb, createdAt: 2 })
    const newest = await seedFile(ctx, { size: 2 * gb, createdAt: 3 })
    const empty = await seedFile(ctx, { size: 0, createdAt: 4 })
    const other = await seedFile(ctx, {
      organizationId: "other",
      size: gb,
      createdAt: 5,
    })
    const share = await ctx.db.insert("shares", {
      organizationId: "org",
      secret: "test-share-only",
      createdAt: 1,
      expiresAt: Date.now() + gb,
      target: { kind: "file", id: newest.fileId },
    })
    const row = await requireUsage(ctx)
    await ctx.db.patch(row._id, {
      overCapacityAt: Date.now() - storage.graceMs,
      overCapacityNoticeId: await seedNotice(ctx),
    })
    return { oldest, middle, newest, empty, other, share }
  })
  await Promise.all([
    t.mutation(sweep, { organizationId: "org" }),
    t.mutation(sweep, { organizationId: "org" }),
  ])
  await t.run(async (ctx) => {
    expect(await ctx.db.get(ids.newest.fileId)).toBeNull()
    expect(await ctx.db.get(ids.share)).toBeNull()
    expect(await blobExists(ctx, ids.newest.blobKey)).toBe(false)
    for (const keep of [ids.oldest, ids.middle, ids.empty, ids.other]) {
      expect(await ctx.db.get(keep.fileId)).not.toBeNull()
      expect(await blobExists(ctx, keep.blobKey)).toBe(true)
    }
    expect(await usageBucket(ctx, "org")).toMatchObject({
      bytes: 25 * gb,
      count: 3,
    })
    expect((await usageBucket(ctx, "org"))?.overCapacityAt).toBeUndefined()
  })
})

test("restored capacity cancels expiry and stale continuation cannot restart it", async () => {
  const t = setup()
  const noticeId = await t.run(async (ctx) => {
    const account = await seedAccount(ctx)
    await seedFile(ctx, { size: 26 * gb, createdAt: 1 })
    await ctx.db.patch(account, {
      storage: {
        subscriptionId: "test-storage",
        purchaseOrderId: "test-order",
        extraGb: 4,
      },
    })
    const row = await requireUsage(ctx)
    const noticeId = await seedNotice(ctx)
    await ctx.db.patch(row._id, {
      overCapacityAt: Date.now() - storage.graceMs,
      overCapacityNoticeId: noticeId,
    })
    return noticeId
  })
  await t.mutation(sweep, { organizationId: "org" })
  await t.mutation(sweep, { organizationId: "org", noticeId })
  await t.run(async (ctx) => {
    expect(
      (await usageBucket(ctx, "org"))?.overCapacityNoticeId
    ).toBeUndefined()
    expect(await ctx.db.query("files").collect()).toHaveLength(1)
  })
})

test("large deletions are bounded and each later batch rechecks restored capacity", async () => {
  const t = setup()
  const account = await t.run(async (ctx) => {
    const account = await seedAccount(ctx)
    for (let i = 1; i <= 46; i++) {
      await seedFile(ctx, { size: gb, createdAt: i })
    }
    const row = await requireUsage(ctx)
    await ctx.db.patch(row._id, {
      overCapacityAt: Date.now() - storage.graceMs,
      overCapacityNoticeId: await seedNotice(ctx),
    })
    return account
  })
  await t.mutation(sweep, { organizationId: "org" })
  await t.run(async (ctx) => {
    expect((await usageBucket(ctx, "org"))?.bytes).toBe(26 * gb)
    await ctx.db.patch(account, {
      storage: {
        subscriptionId: "test-storage",
        purchaseOrderId: "test-order",
        extraGb: 4,
      },
    })
  })
  await t.mutation(sweep, { organizationId: "org" })
  expect(
    await t.run(async (ctx) => (await usageBucket(ctx, "org"))?.bytes)
  ).toBe(26 * gb)
})

test.each(["paused", "deleting", "unmetered", "refund"])(
  "%s workspace is protected from capacity deletion",
  async (state) => {
    const t = setup()
    const file = await t.run(async (ctx) => {
      const account = await seedAccount(ctx)
      const file = await seedFile(ctx, { size: 26 * gb, createdAt: 1 })
      const row = await requireUsage(ctx)
      await ctx.db.patch(row._id, {
        overCapacityAt: Date.now() - storage.graceMs,
        overCapacityNoticeId: await seedNotice(ctx),
      })
      if (state === "paused") {
        await ctx.db.patch(account, { state: { kind: "paused" } })
      }
      if (state === "refund") {
        await ctx.db.patch(account, { refundHold: "test-refund" })
      }
      if (state === "deleting") {
        await ctx.db.insert("workspaceRetention", {
          organizationId: "org",
          state: "deleting",
          endedAt: 1,
          deletesAt: 1,
        })
      }
      if (state === "unmetered") {
        await ctx.db.patch(file.fileId, { metered: undefined })
      }
      return file
    })
    await t.mutation(sweep, { organizationId: "org" })
    expect(
      await t.run(async (ctx) => await ctx.db.get(file.fileId))
    ).not.toBeNull()
  }
)

test("a failed blob cleanup rolls back the file and usage changes", async () => {
  const t = setup()
  const file = await t.run(async (ctx) => {
    await seedAccount(ctx)
    const file = await seedFile(ctx, { size: 26 * gb, createdAt: 1 })
    const row = await requireUsage(ctx)
    await ctx.db.patch(row._id, {
      overCapacityAt: Date.now() - storage.graceMs,
      overCapacityNoticeId: await seedNotice(ctx),
    })
    return file
  })
  vi.stubEnv("R2_ACCOUNT_ID", "")
  await expect(t.mutation(sweep, { organizationId: "org" })).rejects.toThrow()
  await t.run(async (ctx) => {
    expect(await ctx.db.get(file.fileId)).not.toBeNull()
    expect((await usageBucket(ctx, "org"))?.bytes).toBe(26 * gb)
  })
})

test.each([-25, Number.NaN, Number.POSITIVE_INFINITY])(
  "invalid capacity %s fails closed before deleting files",
  async (extraGb) => {
    const t = setup()
    const file = await t.run(async (ctx) => {
      const account = await seedAccount(ctx)
      const file = await seedFile(ctx, { size: 26 * gb, createdAt: 1 })
      const row = await requireUsage(ctx)
      await ctx.db.patch(row._id, {
        overCapacityAt: Date.now() - storage.graceMs,
        overCapacityNoticeId: await seedNotice(ctx),
      })
      await ctx.db.patch(account, {
        storage: {
          subscriptionId: "test-storage",
          purchaseOrderId: "test-order",
          extraGb,
        },
      })
      return file
    })
    await t.mutation(sweep, { organizationId: "org" })
    expect(
      await t.run(async (ctx) => await ctx.db.get(file.fileId))
    ).not.toBeNull()
  }
)
