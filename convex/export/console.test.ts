// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { beforeEach, expect, test, vi } from "vitest"
import { api, internal } from "../_generated/api"
import schema from "../schema"

const ownership = vi.hoisted(() => ({ role: "owner", findOne: vi.fn() }))
vi.mock("../auth", () => ({
  authComponent: { adapter: () => () => ({ findOne: ownership.findOne }) },
  createAdapterOptions: () => ({}),
}))
vi.mock("../persons/account", () => ({
  resolveConsolePerson: async () => undefined,
}))
const modules = import.meta.glob("/convex/{_generated,export}/**/*.{ts,js}")
beforeEach(() => {
  ownership.role = "owner"
  ownership.findOne.mockImplementation(async () => ({ role: ownership.role }))
})

test("exports enforce authentication, active org and live owner role on every page", async () => {
  const t = convexTest(schema, modules)
  const args = {
    organizationId: "org",
    section: "folders" as const,
    cursor: null,
  }
  await expect(t.query(api.export.console.resources, args)).rejects.toThrow(
    "Sign in"
  )
  await expect(
    t.withIdentity({ org: "other" }).query(api.export.console.resources, args)
  ).rejects.toThrow("another organization")
  const caller = t.withIdentity({ org: "org", subject: "auth-user" })
  expect((await caller.query(api.export.console.resources, args)).page).toEqual(
    []
  )
  expect(ownership.findOne).toHaveBeenCalledWith(
    expect.objectContaining({
      where: [
        { field: "organizationId", value: "org" },
        { field: "userId", value: "auth-user" },
      ],
    })
  )
  ownership.role = "admin"
  await expect(
    caller.query(api.export.console.resources, args)
  ).rejects.toThrow("current workspace owner")
})

test("public export omits private and foreign collections; operator export includes private content only in its org", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    for (const [organizationId, visibility, name] of [
      ["org", "organization", "shared"],
      ["org", "private", "private"],
      ["other", "organization", "foreign"],
    ] as const) {
      await ctx.db.insert("collections", {
        organizationId,
        visibility: { mode: visibility },
        name,
        kind: "store",
        schemaHash: "hash",
        createdAt: 1,
        updatedAt: 1,
      })
    }
  })
  const args = {
    organizationId: "org",
    section: "collections" as const,
    cursor: null,
  }
  const visible = await t
    .withIdentity({ org: "org", subject: "auth-user" })
    .query(api.export.console.resources, args)
  expect(visible.page.map((row) => "name" in row && row.name)).toEqual([
    "shared",
  ])
  const complete = await t.query(internal.export.support.resources, args)
  expect(complete.page.map((row) => "name" in row && row.name)).toEqual([
    "shared",
    "private",
  ])
})

test("child exports and file downloads reject forged foreign or private parent IDs", async () => {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const collection = await ctx.db.insert("collections", {
      organizationId: "other",
      visibility: { mode: "organization" },
      name: "foreign",
      kind: "store",
      schemaHash: "hash",
      createdAt: 1,
      updatedAt: 1,
    })
    const file = await ctx.db.insert("files", {
      organizationId: "org",
      visibility: { mode: "private" },
      storageId: await ctx.storage.store(new Blob(["secret"])),
      name: "secret.txt",
      mimeType: "text/plain",
      size: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    return { collection, file }
  })
  const caller = t.withIdentity({ org: "org", subject: "auth-user" })
  await expect(
    caller.query(api.export.console.children, {
      organizationId: "org",
      section: "documents",
      parentId: ids.collection,
      cursor: null,
    })
  ).rejects.toThrow("Collection is unavailable")
  await expect(
    t.query(internal.export.support.children, {
      organizationId: "org",
      section: "documents",
      parentId: ids.collection,
      cursor: null,
    })
  ).rejects.toThrow("Collection is unavailable")
  await expect(
    caller.query(api.export.console.file, {
      organizationId: "org",
      fileId: ids.file,
    })
  ).rejects.toThrow("File is unavailable")
})

test("pagination exports every visible record across page boundaries", async () => {
  const t = convexTest(schema, modules)
  await t.run(async (ctx) => {
    for (let index = 0; index < 45; index++) {
      await ctx.db.insert("collections", {
        organizationId: "org",
        visibility: { mode: "organization" },
        name: `table-${index}`,
        kind: "table",
        columns: [],
        schemaHash: "hash",
        createdAt: index,
        updatedAt: index,
      })
    }
  })
  const caller = t.withIdentity({ org: "org", subject: "auth-user" })
  const ids = new Set<string>()
  let cursor: string | null = null
  for (;;) {
    const result: {
      page: { _id: string }[]
      isDone: boolean
      continueCursor: string
    } = await caller.query(api.export.console.resources, {
      organizationId: "org",
      section: "collections",
      cursor,
    })
    expect(result.page.length).toBeLessThanOrEqual(20)
    for (const row of result.page) {
      ids.add(row._id)
    }
    if (result.isDone) {
      break
    }
    cursor = result.continueCursor
  }
  expect(ids.size).toBe(45)
})
