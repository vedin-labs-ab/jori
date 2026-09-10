import { afterEach, expect, test, vi } from "vitest"
import { transactionalConsoleContext } from "../../../test/convex/conversations"
import { folderDoc } from "../../../test/convex/folders"
import { fileResource } from "../../folders/filing"
import { findSession } from "../../sessions/data"
import { listOrganizationViewerIds } from "../../visibility/audience"
import { transitionConversationVisibility } from "../sharing"

vi.mock("../../runs/execution/workflow", () => ({ startRun: vi.fn() }))
vi.mock("../../visibility/audience", () => ({
  listOrganizationViewerIds: vi.fn(),
}))
afterEach(() => vi.useRealTimers())

test("filing keeps equivalent audiences running and resets changed audiences immediately", async () => {
  vi.useFakeTimers()
  const f = await transactionalConsoleContext()
  vi.mocked(listOrganizationViewerIds).mockResolvedValue(f.people)
  const folders = await f.t.run(async (ctx) => {
    const chat = await ctx.db.get(f.conversationId)
    if (chat === null) {
      throw new Error("Missing fixture")
    }
    await transitionConversationVisibility(
      ctx,
      chat,
      { mode: "organization" },
      f.people[0]
    )
    return await Promise.all(
      ["organization", "private"].map((mode) =>
        ctx.db.insert("folders", {
          ...folderDoc({ organizationId: "org", createdBy: f.people[0] }),
          visibility:
            mode === "private" ? { mode: "private" } : { mode: "organization" },
        })
      )
    )
  })
  await f.send(f.people[1], "Shared work")
  const session = await f.t.run((ctx) => findSession(ctx, f.conversationId))
  const move = (folderId: (typeof folders)[number]) =>
    f.t.run((ctx) =>
      fileResource(ctx, {
        organizationId: "org",
        personId: f.people[0],
        resourceType: "chat",
        resourceId: f.conversationId,
        folderId,
      })
    )
  await move(folders[0])
  expect(await f.t.run((ctx) => findSession(ctx, f.conversationId))).toEqual(
    session
  )
  await move(folders[1])
  expect(await f.t.run((ctx) => findSession(ctx, f.conversationId))).toBeNull()
  await f.t.run(async (ctx) => {
    if (session?.runId === undefined) {
      throw new Error("Missing shared run")
    }
    expect(await ctx.db.get(session.runId)).toMatchObject({
      status: "stopped",
      stoppedBy: { personId: f.people[0] },
    })
    expect(await ctx.db.get(f.conversationId)).toMatchObject({
      folderId: folders[1],
      visibility: { mode: "organization" },
    })
  })
})
