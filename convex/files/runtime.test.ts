import { afterEach, expect, test, vi } from "vitest"
import { transactionalConsoleContext } from "../../test/convex/conversations"
import { internal } from "../_generated/api"

vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))
afterEach(() => vi.useRealTimers())

test("generated files inherit private chat ownership and filing instead of the upload's public default", async () => {
  vi.useFakeTimers()
  const f = await transactionalConsoleContext()
  const { folderId, storageId } = await f.t.run(async (ctx) => {
    const folderId = await ctx.db.insert("folders", {
      organizationId: "org",
      name: "Team work",
      visibility: { mode: "organization" },
      createdBy: f.people[0],
      createdAt: 1,
      updatedAt: 1,
    })
    await ctx.db.patch(f.conversationId, { folderId })
    await ctx.db.patch(f.runId, { status: "running" })
    return {
      folderId,
      storageId: await ctx.storage.store(new Blob(["Private draft"])),
    }
  })
  const fileId = await f.t.mutation(internal.files.data.record, {
    organizationId: "org",
    runId: f.runId,
    storageId,
    name: "draft.txt",
    mimeType: "text/plain",
    size: 13,
    visibility: { mode: "organization" },
  })
  expect(await f.t.run((ctx) => ctx.db.get(fileId))).toMatchObject({
    visibility: { mode: "private" },
    ownerId: f.people[0],
    folderId,
  })
  expect(
    await f.t.query(internal.files.data.read, {
      organizationId: "org",
      personId: f.people[1],
      fileId,
    })
  ).toBeNull()
})
