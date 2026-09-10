import { afterEach, expect, test, vi } from "vitest"
import { transactionalConsoleContext } from "../../test/convex/conversations"
import { internal } from "../_generated/api"
import { insertConsoleReply } from "../messages/console"
import {
  claimReusableSandbox,
  upsertSandbox,
} from "../runs/execution/sandboxes/data"
import { createInstructionRun } from "../runs/instruction"
import { findSession } from "../sessions/data"
import { drainSession } from "../sessions/drain"
import { listOrganizationViewerIds } from "../visibility/audience"
import { transitionConversationVisibility } from "./sharing"

vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))
vi.mock("../visibility/audience", () => ({listOrganizationViewerIds: vi.fn()}))
afterEach(() => vi.useRealTimers())

test("sharing ends personal execution and descendants without carrying context into the new session", async () => {
  vi.useFakeTimers()
  const f = await transactionalConsoleContext()
  vi.mocked(listOrganizationViewerIds).mockResolvedValue(f.people)
  const childId = await f.t.run(async (ctx) => {
    const conversation = await ctx.db.get(f.conversationId)
    const parent = await ctx.db.get(f.runId)
    if (conversation === null || parent === null) {
      throw new Error("Missing fixture")
    }
    await ctx.db.patch(f.sessionId, {
      recency: { due: [], done: [], seen: [], requester: "Private context" },
    })
    await ctx.db.patch(f.runId, {
      compaction: {
        clearedAtTurn: 1,
        summary: { before: 3, content: "Private tool result", turn: 1 },
      },
    })
    await upsertSandbox(ctx, { runId: f.runId, externalId: "personal-sandbox" })
    const child = await createInstructionRun(ctx, {
      organizationId: parent.organizationId,
      instructions: "Help",
      parent,
      createdBy: f.people[0],
    })
    await transitionConversationVisibility(
      ctx,
      conversation,
      { mode: "organization" },
      f.people[0]
    )
    return child
  })
  await f.send(f.people[1], "I can take the next part.")
  await f.t.run(async (ctx) => {
    const session = await findSession(ctx, f.conversationId)
    if (session?.runId === undefined) {
      throw new Error("Missing new session")
    }
    expect(session._id).not.toBe(f.sessionId)
    expect(session.recency?.requester).toBeUndefined()
    expect(await ctx.db.get(f.runId)).toMatchObject({
      status: "stopped",
      stoppedBy: { personId: f.people[0] },
    })
    expect(await ctx.db.get(childId)).toMatchObject({ status: "stopped" })
    expect(await ctx.db.get(session.runId)).toMatchObject({
      principal: { kind: "organization" },
      createdBy: f.people[1],
    })
    expect((await ctx.db.get(session.runId))?.compaction).toBeUndefined()
    expect(await claimReusableSandbox(ctx, session.runId)).toBeNull()
    expect(await claimReusableSandbox(ctx, f.runId)).toBeNull()
    expect(
      await drainSession(ctx, { sessionId: f.sessionId, runId: f.runId })
    ).toMatchObject({ messages: [] })
    expect(await ctx.db.query("messages").take(10)).toHaveLength(2)
  })
})

test("a visibility transition rejects late replies and summaries from the old execution", async () => {
  vi.useFakeTimers()
  const f = await transactionalConsoleContext()
  vi.mocked(listOrganizationViewerIds).mockResolvedValue(f.people)
  const pending = await f.t.query(internal.conversations.summary.data.pending, {
    conversationId: f.conversationId,
  })
  if (pending === null) {
    throw new Error("Missing pending summary")
  }
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
  await expect(
    f.t.run((ctx) =>
      insertConsoleReply(ctx, {
        conversationId: f.conversationId,
        runId: f.runId,
        text: "Late personal result",
      })
    )
  ).rejects.toThrow("no longer active")
  const storageId = await f.t.run((ctx) =>
    ctx.storage.store(new Blob(["late result"]))
  )
  await expect(
    f.t.mutation(internal.files.data.record, {
      organizationId: "org",
      runId: f.runId,
      storageId,
      name: "late.txt",
      mimeType: "text/plain",
      size: 11,
      visibility: { mode: "organization" },
    })
  ).rejects.toThrow("no longer active")
  await f.t.mutation(internal.conversations.summary.data.commit, {
    conversationId: f.conversationId,
    functionId: pending.functionId,
    summarizedAt: pending.readAt,
    summary: "Stale personal summary",
  })
  await f.t.run(async (ctx) => {
    expect((await ctx.db.get(f.conversationId))?.summary).toBeUndefined()
    expect(await ctx.db.query("messages").take(10)).toHaveLength(1)
  })
})

test("shared audience edits reset context and returning private creates personal execution", async () => {
  vi.useFakeTimers()
  const f = await transactionalConsoleContext()
  vi.mocked(listOrganizationViewerIds).mockResolvedValue(f.people)
  const change = (
    visibility: Parameters<typeof transitionConversationVisibility>[2]
  ) =>
    f.t.run(async (ctx) => {
      const conversation = await ctx.db.get(f.conversationId)
      if (conversation === null) {
        throw new Error("Missing fixture")
      }
      await transitionConversationVisibility(
        ctx,
        conversation,
        visibility,
        f.people[0]
      )
    })
  await change({ mode: "organization" })
  await f.send(f.people[1], "Workspace turn.")
  const session = await f.t.run((ctx) => findSession(ctx, f.conversationId))
  await change({ mode: "people", personIds: [f.people[1]] })
  expect(await f.t.run((ctx) => findSession(ctx, f.conversationId))).toEqual(
    session
  )
  await change({ mode: "private" })
  await expect(f.send(f.people[1], "Private now?")).rejects.toThrow(
    "Conversation not found"
  )
  await f.send(f.people[0], "My personal follow-up.")
  await f.t.run(async (ctx) => {
    const current = await findSession(ctx, f.conversationId)
    if (current?.runId === undefined) {
      throw new Error("Missing session")
    }
    expect(current._id).not.toBe(session?._id)
    expect(await ctx.db.get(current.runId)).toMatchObject({
      principal: { kind: "person", personId: f.people[0] },
    })
  })
})
