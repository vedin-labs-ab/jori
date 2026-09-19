// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { expect, test } from "vitest"
import { storage } from "../../../../contracts/billing"
import {
  retentionClock,
  retentionTest as setup,
} from "../../../../test/convex/materials/retention"
import { api } from "../../../_generated/api"
import { authComponent, createAdapterOptions } from "../../../auth"
import { seedAuth } from "../../../retention/erasure/fixtures"
import { seedAccount, seedFile } from "./fixtures"

retentionClock()
const gb = storage.bytesPerGb

test("owner preview does not expose private filenames and strangers cannot read it", async () => {
  const t = setup()
  const { user, org } = await t.run(seedAuth)
  await t.run(async (ctx) => {
    await seedAccount(ctx, org)
    await seedFile(ctx, { organizationId: org, size: 24 * gb, createdAt: 1 })
    await seedFile(ctx, { organizationId: org, size: gb, createdAt: 2 })
    await seedFile(ctx, {
      organizationId: org,
      size: 2 * gb,
      createdAt: 3,
      private: true,
    })
  })
  const result = await t
    .withIdentity({ subject: user, org })
    .query(api.files.capacity.retention.console.overview, {
      organizationId: org,
    })
  expect(result).toMatchObject({
    excessBytes: 2 * gb,
    files: [],
    hiddenCount: 1,
    hiddenBytes: 2 * gb,
    more: false,
  })
  await expect(
    t
      .withIdentity({ subject: "stranger", org })
      .query(api.files.capacity.retention.console.overview, {
        organizationId: org,
      })
  ).rejects.toThrow("owner")
})

test("affected-file preview expands a current newest-first prefix", async () => {
  const t = setup()
  const { user, org } = await t.run(seedAuth)
  await t.run(async (ctx) => {
    await seedAccount(ctx, org)
    await seedFile(ctx, { organizationId: org, size: 25 * gb, createdAt: 1 })
    await seedFile(ctx, { organizationId: org, size: gb, createdAt: 2 })
    await seedFile(ctx, { organizationId: org, size: gb, createdAt: 3 })
  })
  const owner = t.withIdentity({ subject: user, org })
  const first = await owner.query(
    api.files.capacity.retention.console.overview,
    { organizationId: org, limit: 1 }
  )
  expect(first?.files.map((file) => file.createdAt)).toEqual([3])
  expect(first?.more).toBe(true)
  const full = await owner.query(
    api.files.capacity.retention.console.overview,
    { organizationId: org, limit: 2 }
  )
  expect(full?.files.map((file) => file.createdAt)).toEqual([3, 2])
  expect(full?.more).toBe(false)
})

test("ordinary members can open Billing without gaining access to retention controls", async () => {
  const t = setup()
  const { user, org } = await t.run(seedAuth)
  await t.run(async (ctx) => {
    const adapter = authComponent.adapter(ctx)(createAdapterOptions())
    await adapter.update({
      model: "member",
      where: [
        { field: "organizationId", value: org },
        { field: "userId", value: user },
      ],
      update: { role: "member" },
    })
  })
  expect(
    await t
      .withIdentity({ subject: user, org })
      .query(api.files.capacity.retention.console.overview, {
        organizationId: org,
      })
  ).toBeNull()
})
