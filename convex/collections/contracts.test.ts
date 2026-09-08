// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { type JsonObject } from "../../contracts/json"
import { schemaViolations } from "../../test/convex/schema"
import { type ActionCtx } from "../_generated/server"
import { callJoriTool } from "../broker/jori"
import { getToolResponseSchema } from "../runs/agent/tools/schemas/responses"
import schema from "../schema"

const modules = import.meta.glob("/convex/**/*.{ts,js}")

test("current table creation, reads and searches expose names without internal column IDs", async () => {
  const { call } = await fixture()
  const columns: JsonObject[] = [
    { name: "Title", type: "string", required: true },
    { name: "Count", type: "integer" },
    { name: "Amount", type: "float" },
    { name: "Enabled", type: "boolean" },
  ]
  const created = await call("create_table", {
    name: "Contract fixture",
    columns,
  })
  const result = created as { tableId: string; columns: unknown[] }
  expect(result.columns).toEqual(columns)
  expect(
    schemaViolations(created, getToolResponseSchema("create_table"))
  ).toEqual([])
  expect(
    schemaViolations(
      await call("read_table", { tableId: result.tableId }),
      getToolResponseSchema("read_table")
    )
  ).toEqual([])
  expect(
    schemaViolations(
      await call("search_tables", {}),
      getToolResponseSchema("search_tables")
    )
  ).toEqual([])
  expect(
    schemaViolations(
      { ...result, columns: [{ ...columns[0], id: "old-column-id" }] },
      getToolResponseSchema("create_table")
    )
  ).not.toEqual([])
})

test("current store writes validate for replace, merge, winning and held claims", async () => {
  const { call } = await fixture()
  const store = (await call("create_store", { name: "Contract fixture" })) as {
    storeId: string
  }
  const write = (input: JsonObject) =>
    call("write_store", { storeId: store.storeId, ...input })
  const written = await write({ value: { count: 1 } })
  const merged = await write({ patch: { count: 2 } })
  const won = await write({ claim: { path: ["owner"], value: "A" } })
  const held = await write({ claim: { path: ["owner"], value: "B" } })
  for (const result of [written, merged, won, held]) {
    expect(
      schemaViolations(result, getToolResponseSchema("write_store"))
    ).toEqual([])
  }
  expect(won).toMatchObject({
    claimed: true,
    valueUpdatedAt: expect.any(Number),
  })
  expect(held).toEqual({ claimed: false, existing: "A", version: 3 })
  expect(written).not.toHaveProperty("updatedAt")
  expect(
    schemaViolations(
      { ...(written as object), updatedAt: 100 },
      getToolResponseSchema("write_store")
    )
  ).not.toEqual([])
})

test("all native share handlers return the documented secret-bearing URL and path", async () => {
  const { t, call, personId } = await fixture()
  const table = (await call("create_table", { name: "Share table" })) as {
    tableId: string
  }
  const store = (await call("create_store", { name: "Share store" })) as {
    storeId: string
  }
  const fileId = await t.run(
    async (ctx) =>
      await ctx.db.insert("files", {
        organizationId: "verification",
        ownerId: personId,
        visibility: { mode: "private" },
        storageId: await ctx.storage.store(new Blob(["Synthetic fixture"])),
        name: "fixture.txt",
        mimeType: "text/plain",
        size: 17,
        createdAt: 1,
        updatedAt: 1,
      })
  )
  for (const [tool, args] of [
    ["share_table", { tableId: table.tableId }],
    ["share_store", { storeId: store.storeId }],
    ["share_file", { fileId }],
  ] as const) {
    const result = await call(tool, { ...args, expiresInHours: 1 })
    expect(result).toMatchObject({
      url: expect.stringContaining("#share="),
      urlPath: expect.stringContaining("#share="),
      expiresAt: expect.any(Number),
    })
    expect(schemaViolations(result, getToolResponseSchema(tool))).toEqual([])
    expect(
      schemaViolations(
        { url: "/missing-path", expiresAt: 1 },
        getToolResponseSchema(tool)
      )
    ).not.toEqual([])
  }
})

async function fixture() {
  const t = convexTest(schema, modules)
  const personId = await t.run(
    async (ctx) =>
      await ctx.db.insert("persons", {
        organizationId: "verification",
        createdAt: 1,
        updatedAt: 1,
      })
  )
  const ctx = {
    runMutation: t.mutation,
    runQuery: t.query,
  } as unknown as ActionCtx
  const run = {
    organizationId: "verification",
    principal: { kind: "person" as const, personId },
  }
  const call = (tool: string, args: JsonObject) =>
    callJoriTool(ctx, run, { tool, args })
  return { t, call, personId }
}
