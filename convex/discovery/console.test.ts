// @vitest-environment edge-runtime
import { convexTest } from "convex-test"
import { afterEach, expect, test, vi } from "vitest"
import { type Candidate, type Hit } from "../../contracts/discovery"
import { api, internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx, type MutationCtx } from "../_generated/server"
import authSchema from "../betterauth/schema"
import schema from "../schema"
import { collect } from "./retrieval"
import { project } from "./source"
import { raise } from "./sync/intent"

const modules = import.meta.glob("/convex/**/*.{ts,js}")
const authModules = import.meta.glob("/convex/betterauth/**/*.{ts,js}")
const mocks = vi.hoisted(() => ({ retrieve: vi.fn() }))
vi.mock("./provider/query", () => ({ retrieve: mocks.retrieve }))
afterEach(() => vi.useRealTimers())
async function fixture() {
  vi.useFakeTimers()
  const t = convexTest(schema, modules)
  t.registerComponent("betterAuth", authSchema, authModules)
  const data = await t.run(async (ctx) => {
    const people = await seedPeople(ctx)
    const resources = await seedResources(ctx, people)
    const indexed = await seedIndex(ctx, resources.row)
    return { ...people, ...resources, ...indexed }
  })
  const viewer = t.withIdentity({
    subject: "member",
    org: "org",
    tokenIdentifier: "issuer|member",
  })
  const args = {
    organizationId: "org",
    text: "INVOICE",
    candidates: [data.candidate],
  }
  return { t, viewer, args, ...data }
}
test("an owner can find their row without learning private ancestor names; locators point into the row", async () => {
  const { viewer, args, row } = await fixture()
  const hits = await viewer.query(api.discovery.console.visible, args)
  expect(hits).toHaveLength(1)
  expect(hits[0].location).toMatchObject({
    kind: "row",
    id: row,
    start: 6,
    end: 13,
  })
  expect(JSON.stringify(hits)).not.toContain("Confidential ancestor")
})
test("cross-workspace probes, changed rows, deletion and revoked access expose no indexed excerpt", async () => {
  const { t, viewer, args, row, table, owner } = await fixture()
  expect(
    await viewer.query(api.discovery.console.visible, {
      ...args,
      organizationId: "foreign",
    })
  ).toEqual([])
  expect(await t.query(api.discovery.console.visible, args)).toEqual([])
  await t.run((ctx) => ctx.db.patch(row, { value: { name: "Replacement" } }))
  expect(await viewer.query(api.discovery.console.visible, args)).toEqual([])
  await t.run((ctx) => ctx.db.patch(row, { value: { name: "INVOICE-1042" } }))
  await t.run((ctx) => ctx.db.patch(table, { ownerId: owner }))
  expect(await viewer.query(api.discovery.console.visible, args)).toEqual([])
  await t.run((ctx) => ctx.db.delete(row))
  expect(await viewer.query(api.discovery.console.visible, args)).toEqual([])
})
test("pending indexing bypasses stale permission filters without disclosing pending counts", async () => {
  const { t, viewer, key } = await fixture()
  expect(
    (
      await viewer.query(internal.discovery.console.scope, {
        organizationId: "org",
      })
    ).viewer
  ).toBeDefined()
  await t.run((ctx) => raise(ctx, "org", key))
  expect(
    await viewer.query(internal.discovery.console.scope, {
      organizationId: "org",
    })
  ).toEqual({ allowed: true })
})

async function seedPeople(ctx: MutationCtx) {
  const person = await ctx.db.insert("persons", {
    organizationId: "org",
    createdAt: 1,
    updatedAt: 1,
  })
  await ctx.db.insert("identities", {
    organizationId: "org",
    personId: person,
    provider: "auth",
    externalId: "member",
    link: { method: "oauth", at: 1 },
    createdAt: 1,
    updatedAt: 1,
  })
  const owner = await ctx.db.insert("persons", {
    organizationId: "org",
    createdAt: 1,
    updatedAt: 1,
  })

  return { person, owner }
}

async function seedResources(
  ctx: MutationCtx,
  { person, owner }: { person: Id<"persons">; owner: Id<"persons"> }
) {
  const folder = await ctx.db.insert("folders", {
    organizationId: "org",
    name: "Confidential ancestor",
    createdBy: owner,
    visibility: { mode: "private" },
    createdAt: 1,
    updatedAt: 1,
  })
  const table = await ctx.db.insert("collections", {
    organizationId: "org",
    kind: "table",
    name: "Suppliers",
    ownerId: person,
    folderId: folder,
    visibility: { mode: "private" },
    columns: [{ id: "name", name: "Name", type: "string" }],
    schemaHash: "test",
    createdAt: 1,
    updatedAt: 1,
  })
  const row = await ctx.db.insert("documents", {
    collectionId: table,
    value: { name: "INVOICE-1042" },
    version: 1,
    createdAt: 1,
    updatedAt: 1,
  })

  return { folder, table, row }
}

async function seedIndex(ctx: MutationCtx, row: Id<"documents">) {
  const key = `documents:${row}`,
    source = await project(ctx, key)
  if (!source) {
    throw new Error("Missing projection")
  }
  await ctx.db.insert("discoverySources", {
    organizationId: "org",
    key,
    lane: "text",
    generation: 1,
    pending: false,
    nextAt: 0,
    attempts: 0,
    raisedAt: 1,
    revision: source.revision,
    parts: 1,
  })
  return {
    key,
    candidate: { key, part: 0, revision: source.revision, score: 1 },
  }
}

test("an exact lexical match survives hydration even below twenty semantic candidates", async () => {
  const candidates: Candidate[] = Array.from({ length: 40 }, (_, i) => ({
    key: `files:${i}`,
    revision: "1",
    part: 0,
    score: 1 / (i + 1),
  }))
  mocks.retrieve.mockResolvedValueOnce({
    candidates,
    partial: false,
    unavailable: false,
    more: false,
  })
  const runQuery = vi.fn(async (_query, args: { candidates: Candidate[] }) =>
    args.candidates.map(
      (candidate) =>
        ({
          candidate,
          kind: "file",
          resourceId: candidate.key,
          title:
            candidate.key === "files:39"
              ? "Invoice INV-1042"
              : "Related document",
          resourceName: "Document",
          snippet: "",
          location: { kind: "resource", id: candidate.key },
        }) satisfies Hit
    )
  )
  const result = await collect(
    { runQuery } as unknown as ActionCtx,
    "org",
    "Invoice INV-1042",
    undefined
  )
  expect(result.candidates[0].key).toBe("files:39")
  expect(result.candidates).toHaveLength(20)
  expect(runQuery).toHaveBeenCalledTimes(5)
})

test("a small fully authorized result set does not trigger extra provider queries", async () => {
  mocks.retrieve.mockClear()
  const candidate = { key: "files:one", revision: "1", part: 0, score: 1 }
  mocks.retrieve.mockResolvedValue({
    candidates: [candidate],
    partial: false,
    unavailable: false,
    more: true,
  })
  const hit = {
    candidate,
    kind: "file",
    resourceId: "one",
    title: "Invoice",
    resourceName: "Invoice",
    snippet: "INV-1042",
    location: { kind: "resource", id: "one" },
  } satisfies Hit
  const result = await collect(
    { runQuery: async () => [hit] } as unknown as ActionCtx,
    "org",
    "invoice",
    undefined
  )
  expect(result).toMatchObject({ candidates: [candidate], partial: false })
  expect(mocks.retrieve).toHaveBeenCalledOnce()
})
