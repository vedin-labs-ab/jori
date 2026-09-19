import { afterEach, expect, test, vi } from "vitest"
import { registerBlobs } from "../../test/convex/blobs"
import { transactionalConsoleContext } from "../../test/convex/conversations"
import { internal } from "../_generated/api"
import { seedBlob } from "./blobs/fixtures"

vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))
afterEach(() => vi.useRealTimers())

test("generated files inherit private chat ownership and filing instead of the upload's public default", async () => {
  vi.useFakeTimers()
  const f = await transactionalConsoleContext()
  registerBlobs(f.t)
  const { folderId, blobKey } = await f.t.run(async (ctx) => {
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
      blobKey: await seedBlob(ctx, "org"),
    }
  })
  const fileId = await f.t.mutation(internal.files.data.record, {
    organizationId: "org",
    runId: f.runId,
    blobKey,
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
      epoch: 0,
    })
  ).toBeNull()
})
