// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { internal } from "../_generated/api"
import schema from "../schema"
import { sanitize } from "./records"

const modules = import.meta.glob("/convex/{_generated,export}/**/*.{ts,js}")

test("controller export follows child ownership without returning foreign documents", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    for (const organizationId of ["org", "foreign"]) {
      const collectionId = await ctx.db.insert("collections", {
        organizationId,
        visibility: { mode: "private" },
        kind: "store",
        name: "private",
        schemaHash: "schema",
        createdAt: 1,
        updatedAt: 1,
      })
      await ctx.db.insert("documents", {
        collectionId,
        value: { customer: organizationId },
        version: 1,
        createdAt: 1,
        updatedAt: 1,
      })
    }
  })
  const result = await t.query(internal.export.records.page, {
    organizationId: "org",
    table: "documents",
    cursor: null,
  })
  expect(result.page).toHaveLength(1)
  expect(result.page[0]).toMatchObject({ value: { customer: "org" } })
})

test("controller export strips credential structures and provider metadata while keeping customer content", () => {
  expect(
    sanitize("integrations", {
      _id: "integration",
      name: "Slack",
      credentials: { token: "never-return" },
      data: { unexpectedSecret: "never-return" },
    })
  ).toEqual(expect.objectContaining({ _id: "integration", name: "Slack" }))
  expect(
    JSON.stringify(
      sanitize("integrations", {
        credentials: { token: "never-return" },
        data: { unexpectedSecret: "never-return" },
      })
    )
  ).not.toContain("never-return")
  expect(
    sanitize("traces", {
      text: "customer task",
      args: { apiKey: "never-return", input: "public" },
    })
  ).toEqual({ text: "customer task", args: { input: "public" } })
})
