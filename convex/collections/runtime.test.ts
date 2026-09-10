import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { transactionalConsoleContext } from "../../test/convex/conversations"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { callJoriTool } from "../broker/jori"
import { transitionConversationVisibility } from "../conversations/sharing"
import { listOrganizationViewerIds } from "../visibility/audience"
import { loadPersonTeamIds } from "../visibility/viewer"

vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))
vi.mock("../visibility/audience", async (original) => ({
  ...(await original<typeof import("../visibility/audience")>()),
  listOrganizationViewerIds: vi.fn(),
}))
vi.mock("../visibility/viewer", async (original) => ({
  ...(await original<typeof import("../visibility/viewer")>()),
  loadPersonTeamIds: vi.fn(),
}))

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

test("shared runtime reads and writes its team's collections with workspace ownership", async () => {
  const f = await sharedRuntime()
  const table = (await f.call("create_table", {
    name: "Team update",
    columns: [{ name: "Title", type: "string" }],
  })) as { tableId: Id<"collections"> }
  await f.call("insert_table_row", {
    tableId: table.tableId,
    values: { Title: "Ready" },
  })
  expect(
    await f.call("list_table_rows", { tableId: table.tableId })
  ).toMatchObject({
    rows: [{ values: { Title: "Ready" } }],
  })
  const store = (await f.call("create_store", { name: "Team state" })) as {
    storeId: Id<"collections">
  }
  await f.call("write_store", {
    storeId: store.storeId,
    value: { ready: true },
  })
  expect(await f.call("read_store", { storeId: store.storeId })).toMatchObject({
    value: { ready: true },
  })
  for (const collectionId of [table.tableId, store.storeId]) {
    const resource = await f.t.run((ctx) => ctx.db.get(collectionId))
    expect(resource).toMatchObject({
      folderId: f.folderId,
      visibility: { mode: "organization" },
    })
    expect(resource?.ownerId).toBe(f.people[0])
  }
})

test("a sender override cannot expose private data and stale runs cannot create outputs", async () => {
  const f = await sharedRuntime()
  const privateStore = await f.t.mutation(internal.stores.records.create, {
    organizationId: "org",
    personId: f.people[0],
    name: "Private",
    visibility: { mode: "private" },
  })
  expect(
    await f.t.query(internal.stores.values.read, {
      organizationId: "org",
      personId: f.people[0],
      runId: f.runId,
      storeId: privateStore.storeId,
    })
  ).toBeNull()
  await expect(
    f.call("create_table", { name: "Private", visibility: "private" })
  ).rejects.toThrow("personal execution context")
  await f.t.run((ctx) => ctx.db.patch(f.runId, { status: "stopped" }))
  await expect(f.call("create_store", { name: "Too late" })).rejects.toThrow(
    "no longer active"
  )
  await expect(
    f.t.query(internal.tables.queries.search, {
      organizationId: "foreign",
      runId: f.runId,
    })
  ).rejects.toThrow("no longer active")
})

async function sharedRuntime() {
  const f = await transactionalConsoleContext()
  vi.mocked(listOrganizationViewerIds).mockResolvedValue(f.people)
  vi.mocked(loadPersonTeamIds).mockResolvedValue(new Set(["engineering"]))
  const folderId = await f.t.run(async (ctx) => {
    const folderId = await ctx.db.insert("folders", {
      organizationId: "org",
      name: "Engineering",
      createdBy: f.people[0],
      visibility: { mode: "teams", teamIds: ["engineering"] },
      createdAt: 1,
      updatedAt: 1,
    })
    await ctx.db.patch(f.conversationId, { folderId })
    const chat = await ctx.db.get(f.conversationId)
    if (chat === null) {
      throw new Error("Missing chat")
    }
    await transitionConversationVisibility(
      ctx,
      chat,
      { mode: "organization" },
      f.people[0]
    )
    return folderId
  })
  await f.send(f.people[1], "Prepare our shared update.")
  const runId = await f.t.run(async (ctx) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", f.conversationId)
      )
      .unique()
    if (session?.runId === undefined) {
      throw new Error("Missing run")
    }
    return session.runId
  })
  const context = {
    runQuery: f.t.query,
    runMutation: f.t.mutation,
  } as unknown as ActionCtx
  const call = (tool: string, args: Record<string, unknown>) =>
    callJoriTool(
      context,
      {
        organizationId: "org",
        principal: { kind: "organization" },
        _id: runId,
      },
      { tool, args }
    )
  return { ...f, call, folderId, runId }
}
