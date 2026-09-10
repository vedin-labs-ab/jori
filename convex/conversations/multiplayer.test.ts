import { afterEach, expect, test, vi } from "vitest"
import { transactionalConsoleContext } from "../../test/convex/conversations"
import { recentConversation } from "../messages/history"
import { findSession } from "../sessions/data"
import { drainSession } from "../sessions/drain"
import { transitionConversationVisibility } from "./sharing"

vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))
afterEach(() => vi.useRealTimers())

test("simultaneous participants feed one ordered session with each message's author", async () => {
  vi.useFakeTimers()
  const f = await transactionalConsoleContext()
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
  const sent = await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      f.send(f.people[index % 2], `Message ${index}`)
    )
  )
  expect(sent.filter((result) => result.status === "started")).toHaveLength(1)
  expect(sent.filter((result) => result.status === "continued")).toHaveLength(7)
  await assertOrderedMessages(f, sent)
})

test("a send racing with completion preserves unread messages and an old run cannot drain its successor", async () => {
  vi.useFakeTimers()
  const f = await transactionalConsoleContext()
  const queued = await f.send(f.people[0], "Do this next.")
  await f.t.run((ctx) => ctx.db.patch(f.runId, { status: "completed" }))
  const latest = await f.send(f.people[0], "And this after that.")
  await f.t.run(async (ctx) => {
    const session = await findSession(ctx, f.conversationId)
    if (session?.runId === undefined) {
      throw new Error("Missing session")
    }
    expect(await ctx.db.get(session.runId)).toMatchObject({
      cause: { messageId: queued.messageId },
    })
    expect(
      (await drainSession(ctx, { sessionId: session._id, runId: f.runId }))
        .messages
    ).toEqual([])
    expect(
      (
        await drainSession(ctx, {
          sessionId: session._id,
          runId: session.runId,
        })
      ).messages.map((message) => message.id)
    ).toEqual([latest.messageId])
  })
})

type Fixture = Awaited<ReturnType<typeof transactionalConsoleContext>>

async function assertOrderedMessages(
  f: Fixture,
  sent: Awaited<ReturnType<Fixture["send"]>>[]
) {
  await f.t.run(async (ctx) => {
    const session = await findSession(ctx, f.conversationId)
    if (session?.runId === undefined) {
      throw new Error("Missing session")
    }
    expect(await ctx.db.query("sessions").take(10)).toHaveLength(1)
    expect(await ctx.db.query("runs").take(10)).toHaveLength(2)
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q
          .eq("organizationId", "org")
          .eq("integrationId", undefined)
          .eq("conversationId", f.conversationId)
      )
      .order("asc")
      .take(20)
    const shared = messages.slice(1)
    expect(shared.map((message) => message._id)).toEqual(
      sent.map((result) => result.messageId)
    )
    expect(shared.map((message) => message.personId)).toEqual(
      Array.from({ length: 8 }, (_, index) => f.people[index % 2])
    )
    const drained = await drainSession(ctx, {
      sessionId: session._id,
      runId: session.runId,
    })
    expect(drained.messages.map((message) => message.id)).toEqual(
      sent.slice(1).map((result) => result.messageId)
    )
    expect(drained.messages[0]?.actor).toBe("Teammate")
    expect(
      (
        await drainSession(ctx, {
          sessionId: session._id,
          runId: session.runId,
        })
      ).messages
    ).toEqual([])
    const history = await recentConversation(ctx, shared[0], {
      kind: "organization",
    })
    expect(history.entries.map((entry) => entry.id)).toEqual(
      messages.slice(0, 2).map((message) => message._id)
    )
  })
}
