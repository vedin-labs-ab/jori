import { afterEach, expect, test, vi } from "vitest"
import { transactionalConsoleContext } from "../../test/convex/conversations"
import { internal } from "../_generated/api"
import { readConversationDraft } from "../conversations/draft"
import { transitionConversationVisibility } from "../conversations/execution/sharing"
import { insertConsoleReply } from "../messages/console/records"
import { writeRunDraft } from "../runs/execution/drafts/data"
import { listOrganizationViewerIds } from "../visibility/audience"
import { findSession } from "./data"
import { runExecutionIsCurrent } from "./scope"

vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))
vi.mock("../visibility/audience", () => ({
  listOrganizationViewerIds: vi.fn(),
}))
afterEach(() => vi.useRealTimers())

test("membership changes revoke cached execution before another step or reply", async () => {
  const f = await sharedFixture()
  await f.t.mutation(internal.runs.records.finish, {
    runId: f.sharedRunId,
    result: "Published while current",
  })
  await f.t.run((ctx) =>
    writeRunDraft(ctx, {
      runId: f.sharedRunId,
      reasoning: "",
      text: "Old audience's draft",
      turn: 1,
    })
  )
  vi.mocked(listOrganizationViewerIds).mockResolvedValue([
    ...f.people,
    undefined,
  ])
  await f.t.run(async (ctx) => {
    const run = await ctx.db.get(f.sharedRunId)
    const conversation = await ctx.db.get(f.conversationId)
    if (run === null || conversation === null) {
      throw new Error("Missing fixture")
    }
    expect(await runExecutionIsCurrent(ctx, run)).toBe(false)
    expect(await readConversationDraft(ctx, conversation)).toBeNull()
  })
  await expect(
    f.t.run((ctx) =>
      insertConsoleReply(ctx, {
        conversationId: f.conversationId,
        runId: f.sharedRunId,
        text: "Old audience result",
      })
    )
  ).rejects.toThrow("no longer active")
  await f.t.mutation(internal.runs.records.finish, {
    runId: f.sharedRunId,
    result: "Late result for the old audience",
  })
  expect((await f.t.run((ctx) => ctx.db.get(f.sharedRunId)))?.result).toBe(
    "Published while current"
  )
  await f.t.mutation(internal.sessions.execution.reconcile, {
    runId: f.sharedRunId,
  })
  await f.t.run(async (ctx) => {
    expect(await ctx.db.get(f.sharedRunId)).toMatchObject({ status: "stopped" })
    expect(await findSession(ctx, f.conversationId)).toBeNull()
  })
  await f.send(f.people[1], "Continue with the new audience.")
  expect(
    (await f.t.run((ctx) => findSession(ctx, f.conversationId)))?._id
  ).not.toBe(f.sharedSessionId)
})

test("an ancestor folder audience change resets the session when the next message arrives", async () => {
  const f = await sharedFixture()
  const folderId = await f.t.run(async (ctx) => {
    const folder = await ctx.db.insert("folders", {
      organizationId: "org",
      createdBy: f.people[0],
      name: "Team",
      visibility: { mode: "people", personIds: [f.people[1]] },
      createdAt: 1,
      updatedAt: 1,
    })
    await ctx.db.patch(f.conversationId, { folderId: folder })
    return folder
  })
  vi.mocked(listOrganizationViewerIds).mockResolvedValue([
    ...f.people,
    undefined,
  ])
  await f.t.run(async (ctx) => {
    const run = await ctx.db.get(f.sharedRunId)
    if (run === null) {
      throw new Error("Missing fixture")
    }
    expect(await runExecutionIsCurrent(ctx, run)).toBe(true)
    await ctx.db.patch(folderId, { visibility: { mode: "organization" } })
    expect(await runExecutionIsCurrent(ctx, run)).toBe(false)
  })
  await f.send(f.people[1], "The folder is shared more widely now.")
  await f.t.run(async (ctx) => {
    expect(await ctx.db.get(f.sharedRunId)).toMatchObject({ status: "stopped" })
    const session = await findSession(ctx, f.conversationId)
    expect(session?._id).not.toBe(f.sharedSessionId)
    expect(session?.executionScope).toContain("organization-member")
  })
})

async function sharedFixture() {
  vi.useFakeTimers()
  const f = await transactionalConsoleContext()
  vi.mocked(listOrganizationViewerIds).mockResolvedValue(f.people)
  await f.t.run(async (ctx) => {
    const conversation = await ctx.db.get(f.conversationId)
    if (conversation === null) {
      throw new Error("Missing fixture")
    }
    await transitionConversationVisibility(
      ctx,
      conversation,
      { mode: "organization" },
      f.people[0]
    )
  })
  await f.send(f.people[0], "Start shared work.")
  const session = await f.t.run((ctx) => findSession(ctx, f.conversationId))
  if (session?.runId === undefined) {
    throw new Error("Missing shared run")
  }
  const sharedRunId = session.runId
  await f.t.run((ctx) => ctx.db.patch(sharedRunId, { status: "running" }))
  return { ...f, sharedRunId, sharedSessionId: session._id }
}
