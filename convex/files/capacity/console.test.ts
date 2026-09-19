// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { expect, test, vi } from "vitest"
import { api } from "../../_generated/api"
import schema from "../../schema"

vi.mock("../../persons/account", () => ({
  resolveConsolePerson: async () => undefined,
}))
const modules = import.meta.glob("/convex/{_generated,files}/**/*.{ts,js}")

async function fixture() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async (ctx) => {
    const owner = await ctx.db.insert("persons", {
      organizationId: "org",
      createdAt: 1,
      updatedAt: 1,
    })
    const folder = {
      organizationId: "org",
      name: "Projects",
      visibility: { mode: "organization" as const },
      createdBy: owner,
      createdAt: 1,
      updatedAt: 1,
    }
    const parent = await ctx.db.insert("folders", folder)
    const child = await ctx.db.insert("folders", {
      ...folder,
      name: "Reports",
      parentId: parent,
    })
    const privateFolder = await ctx.db.insert("folders", {
      ...folder,
      name: "Hidden folder",
      visibility: { mode: "private" },
    })
    for (const row of [
      { key: "total", bytes: 70, count: 4 },
      { key: parent, folderId: parent, bytes: 10, count: 1 },
      { key: child, folderId: child, bytes: 20, count: 1 },
      { key: privateFolder, folderId: privateFolder, bytes: 30, count: 1 },
      { key: "unfiled", bytes: 10, count: 1 },
    ]) {
      await ctx.db.insert("fileUsage", { organizationId: "org", ...row })
    }
    return { parent, child, privateFolder }
  })
  return { t, caller: t.withIdentity({ org: "org" }), ...ids }
}

test("folder storage includes direct files and descendants without double counting", async () => {
  const { caller, parent, child } = await fixture()
  const result = await caller.query(api.files.capacity.console.overview, {
    organizationId: "org",
    folderId: parent,
  })
  expect(result).toMatchObject({
    bytes: 30,
    count: 2,
    folders: [
      { folderId: child, name: "Reports", bytes: 20, count: 1 },
      { folderId: null, name: "Directly in this folder", bytes: 10, count: 1 },
    ],
  })
})

test("workspace totals account for private storage without exposing private folder names", async () => {
  const { caller, parent, privateFolder } = await fixture()
  const result = await caller.query(api.files.capacity.console.overview, {
    organizationId: "org",
  })
  expect(result).toMatchObject({
    bytes: 70,
    count: 4,
    folders: [
      { folderId: parent, name: "Projects", bytes: 30, count: 2 },
      { folderId: null, name: "Unfiled", bytes: 10, count: 1 },
    ],
  })
  await expect(
    caller.query(api.files.capacity.console.overview, {
      organizationId: "org",
      folderId: privateFolder,
    })
  ).rejects.toThrow()
})

test("storage usage rejects unauthenticated and cross-workspace requests", async () => {
  const { t, caller } = await fixture()
  await expect(
    t.query(api.files.capacity.console.overview, { organizationId: "org" })
  ).rejects.toThrow("Sign in")
  await expect(
    caller.query(api.files.capacity.console.overview, {
      organizationId: "other",
    })
  ).rejects.toThrow("another organization")
})
