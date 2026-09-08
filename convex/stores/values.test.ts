// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../_generated/api"
import schema from "../schema"

const modules = import.meta.glob("/convex/{_generated,stores}/**/*.{ts,js}")

afterEach(() => vi.restoreAllMocks())

test("value reads and writes share a clock without rewriting metadata", async () => {
  const { t, args } = await fixture()
  const clock = vi.spyOn(Date, "now").mockReturnValue(200)
  const empty = await t.query(internal.stores.values.read, args)

  expect(empty).toMatchObject({ updatedAt: 100, valueUpdatedAt: null })
  const written = await t.mutation(internal.stores.values.write, {
    ...args,
    write: { type: "replace", value: { count: 1 } },
  })
  expect(written).toMatchObject({ valueUpdatedAt: 200, version: 1 })
  expect(written).not.toHaveProperty("updatedAt")
  expect(await t.query(internal.stores.values.read, args)).toMatchObject({
    updatedAt: 100,
    valueUpdatedAt: 200,
    version: 1,
  })

  clock.mockReturnValue(300)
  await t.mutation(internal.stores.records.update, { ...args, name: "Renamed" })
  expect(await t.query(internal.stores.values.read, args)).toMatchObject({
    name: "Renamed",
    updatedAt: 300,
    valueUpdatedAt: 200,
  })
})

test("held claims and rejected writes leave both clocks unchanged", async () => {
  const { t, args } = await fixture()
  const clock = vi.spyOn(Date, "now").mockReturnValue(200)

  await t.mutation(internal.stores.values.write, {
    ...args,
    write: { type: "claim", path: ["owner"], value: "A" },
  })
  clock.mockReturnValue(300)
  expect(
    await t.mutation(internal.stores.values.write, {
      ...args,
      write: { type: "claim", path: ["owner"], value: "B" },
    })
  ).toEqual({ claimed: false, existing: "A", version: 1 })
  await expect(
    t.mutation(internal.stores.values.write, {
      ...args,
      expectedVersion: 0,
      write: { type: "replace", value: {} },
    })
  ).rejects.toThrow("version conflict")
  expect(await t.query(internal.stores.values.read, args)).toMatchObject({
    updatedAt: 100,
    valueUpdatedAt: 200,
    value: { owner: "A" },
    version: 1,
  })
})

async function fixture() {
  const t = convexTest(schema, modules)
  const organizationId = "store-clock-verification"
  const personId = await t.run((ctx) =>
    ctx.db.insert("persons", { organizationId, createdAt: 100, updatedAt: 100 })
  )
  const storeId = await t.run((ctx) =>
    ctx.db.insert("collections", {
      kind: "store",
      organizationId,
      ownerId: personId,
      name: "Clock fixture",
      visibility: { mode: "private" },
      schemaHash: "fixture",
      createdAt: 100,
      updatedAt: 100,
    })
  )

  return { t, args: { organizationId, personId, storeId } }
}
