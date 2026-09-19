import { expect, test, vi } from "vitest"
import { databaseContext } from "../../../test/convex/database"
import { fileDoc, folderDoc } from "../../../test/convex/materials/folders"
import { type Doc } from "../../_generated/dataModel"
import { purgeFile } from "../records"
import { changeUsage, meterFile, moveFile, usageBucket } from "./meter"

vi.mock("../../discovery/sync/intent")
vi.mock("../blobs", () => ({ deleteBlob: vi.fn() }))

test("bootstrap is idempotent and moving or deleting files preserves organization and folder totals", async () => {
  const { ctx, database } = databaseContext()
  const folder = await database.insert("folders", folderDoc())
  const id = await database.insert("files", fileDoc({ size: 120 }))
  const read = async () => (await database.get(id)) as Doc<"files">
  await meterFile(ctx, await read())
  await meterFile(ctx, await read())
  expect(await usageBucket(ctx, "org")).toMatchObject({ bytes: 120, count: 1 })
  await moveFile(ctx, await read(), folder)
  expect(await usageBucket(ctx, "org")).toMatchObject({ bytes: 120, count: 1 })
  expect(await usageBucket(ctx, "org", "unfiled")).toBeNull()
  expect(await usageBucket(ctx, "org", folder)).toMatchObject({
    bytes: 120,
    count: 1,
  })
  await purgeFile(ctx, await read())
  expect(await usageBucket(ctx, "org")).toMatchObject({ bytes: 0, count: 0 })
  expect(await usageBucket(ctx, "org", folder)).toBeNull()
})

test("quota rejects growth over paid capacity but permits shrinking and isolates organizations", async () => {
  const { ctx } = databaseContext()
  await changeUsage(ctx, {
    organizationId: "org",
    bytes: 25_000_000_000,
    count: 1,
    enforce: true,
  })
  await expect(
    changeUsage(ctx, {
      organizationId: "org",
      bytes: 1,
      count: 1,
      enforce: true,
    })
  ).rejects.toThrow("Storage is full")
  expect(await usageBucket(ctx, "org")).toMatchObject({
    bytes: 25_000_000_000,
    count: 1,
  })
  await changeUsage(ctx, {
    organizationId: "other",
    bytes: 1,
    count: 1,
    enforce: true,
  })
  await changeUsage(ctx, {
    organizationId: "org",
    bytes: -100,
    count: 0,
    enforce: true,
  })
  expect(await usageBucket(ctx, "org")).toMatchObject({
    bytes: 24_999_999_900,
    count: 1,
  })
})

test("paid extra capacity extends the quota without consuming AI credit", async () => {
  const { ctx, database } = databaseContext()
  const account = await database.insert("accounts", {
    organizationId: "org",
    state: { kind: "active" },
    micros: { allowance: 50, wallet: 80 },
    topUp: { charged: { micros: 0 } },
    storage: {
      subscriptionId: "storage-example",
      purchaseOrderId: "order-example",
      extraGb: 30,
    },
    updatedAt: 0,
  })
  await changeUsage(ctx, {
    organizationId: "org",
    bytes: 55_000_000_000,
    count: 1,
    enforce: true,
  })
  await expect(
    changeUsage(ctx, {
      organizationId: "org",
      bytes: 1,
      count: 1,
      enforce: true,
    })
  ).rejects.toThrow("Storage is full")
  expect(await database.get(account)).toMatchObject({
    micros: { allowance: 50, wallet: 80 },
  })
})
