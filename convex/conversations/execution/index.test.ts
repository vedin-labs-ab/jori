import { expect, test, vi } from "vitest"
import {
  fakeMutationCtx,
  inserted,
  type Seed,
} from "../../../test/convex/conversations"
import { id } from "../../../test/convex/database"
import { integrationDoc } from "../../../test/convex/integrations"
import { type Doc, type Id } from "../../_generated/dataModel"
import { startRun } from "../../runs/execution/workflow"
import { startMessageRun } from "./index"

// Starting a run hands it to the workflow component, which needs a real
// backend; these tests are about the rows the start writes.
vi.mock("../../runs/execution/workflow", () => ({ startRun: vi.fn() }))
vi.mock("../../runs/tree", () => ({ stopRunTree: vi.fn() }))

const expectedCursor = {
  message: { createdAt: 0, messageId: "message" },
  reaction: { createdAt: 1000, updatedAt: 1000 },
}

test("starts new conversation message runs as mentions", async () => {
  const ctx = fakeMutationCtx()
  const result = await startMessageRun(ctx, runArgs())

  expect(result.status).toBe("started")
  expect(inserted(ctx, "runs")).toEqual([
    expect.objectContaining({
      audience: "organization",
      cause: { type: "message", messageId: "message", kind: "mention" },
      conversationId: "conversations-1",
    }),
  ])
  expect(inserted(ctx, "conversations")).toEqual([
    expect.objectContaining({
      externalId: "conversation",
      scope: "organization",
    }),
  ])
  expect(inserted(ctx, "sessions")).toEqual([
    expect.objectContaining({
      conversationId: "conversations-1",
      cursor: expectedCursor,
      runId: "runs-1",
    }),
  ])
  expect(startRun).toHaveBeenCalledWith(ctx, "runs-1")
})

test("continues active conversation sessions without starting another run", async () => {
  const conversation = conversationDoc()
  const ctx = fakeMutationCtx([
    ["conversations", conversation],
    ...activeSessionSeed(conversation, "active-run", "running"),
  ])

  const result = await startMessageRun(ctx, {
    ...runArgs({ message: message("Steer this.") }),
    conversation,
  })

  expect(result).toMatchObject({
    runId: "active-run",
    status: "continued",
    sessionId: "session",
  })
  expect(ctx.inserts).toEqual([])
})

test("starts reply runs when the previous session is terminal", async () => {
  const conversation = conversationDoc()
  const ctx = fakeMutationCtx([
    ["conversations", conversation],
    ...activeSessionSeed(conversation, "old-run", "completed"),
  ])

  const result = await startMessageRun(ctx, {
    ...runArgs({ message: message("Following up.") }),
    conversation,
  })

  expect(result.status).toBe("started")
  expect(inserted(ctx, "runs")).toEqual([
    expect.objectContaining({
      cause: { type: "message", messageId: "message", kind: "reply" },
    }),
  ])
  expect(ctx.patches).toContainEqual({
    id: "session",
    patch: expect.objectContaining({
      cursor: expectedCursor,
      runId: "runs-1",
    }),
  })
})

test("starts existing conversations without sessions as mentions", async () => {
  const conversation = conversationDoc()
  const ctx = fakeMutationCtx([["conversations", conversation]])

  const result = await startMessageRun(ctx, {
    ...runArgs({ message: message("First routed task.") }),
    conversation,
  })

  expect(result.status).toBe("started")
  expect(inserted(ctx, "runs")).toEqual([
    expect.objectContaining({
      cause: { type: "message", messageId: "message", kind: "mention" },
    }),
  ])
})

test("starts reply runs when a waiter wake never resumed the run", async () => {
  const conversation = conversationDoc()
  const ctx = fakeMutationCtx([
    ["conversations", conversation],
    ...activeSessionSeed(conversation, "stale-run", "running"),
    [
      "waiters",
      {
        _id: id<"waiters">("waiter"),
        _creationTime: 1000,
        createdAt: 1000,
        updatedAt: 1000,
        expiresAt: 2000,
        runId: id<"runs">("stale-run"),
        status: "woken",
        organizationId: "organization",
        eventId: "event",
      },
    ],
    [
      "traces",
      {
        _id: id<"traces">("trace"),
        _creationTime: 500,
        key: "trace:stale-run:500",
        runId: id<"runs">("stale-run"),
        organizationId: "organization",
        timestamp: 500,
        type: "run.started",
      },
    ],
  ])

  const result = await startMessageRun(ctx, {
    ...runArgs({ now: 10 * 60 * 1000, message: message("Still there?") }),
    conversation,
  })

  expect(result.status).toBe("started")
  expect(inserted(ctx, "runs")).toEqual([
    expect.objectContaining({
      cause: { type: "message", messageId: "message", kind: "reply" },
    }),
  ])
  expect(ctx.patches).toContainEqual({
    id: "session",
    patch: expect.objectContaining({ runId: "runs-1" }),
  })
})

function conversationDoc(): Doc<"conversations"> {
  return {
    _id: id<"conversations">("conversation-doc"),
    _creationTime: 0,
    organizationId: "organization",
    surface: "slack",
    integrationId: id<"integrations">("integration"),
    externalId: "conversation",
    scope: "organization",
  }
}

type StartArgs = Parameters<typeof startMessageRun>[1]

function runArgs(overrides: Partial<StartArgs> = {}): StartArgs {
  return {
    conversation: null,
    integration: integrationDoc({ integration: "slack", externalId: "team" }),
    message: message("Please help."),
    createdBy: "person" as Id<"persons">,
    externalId: "conversation",
    now: 1000,
    ...overrides,
  }
}

function message(text: string, data?: unknown) {
  return {
    _id: id<"messages">("message"),
    _creationTime: 0,
    organizationId: "organization",
    integrationId: id<"integrations">("integration"),
    surface: "slack",
    type: "message.channels",
    externalId: "slack:message",
    mentioned: false,
    conversationId: "conversation",
    text,
    data,
    createdAt: 900,
  } as Parameters<typeof startMessageRun>[1]["message"]
}

function activeSessionSeed(
  conversation: Doc<"conversations">,
  runId: string,
  status: "completed" | "running"
): Seed[] {
  return [
    [
      "sessions",
      {
        _id: id<"sessions">("session"),
        _creationTime: 0,
        conversationId: conversation._id,
        runId: id<"runs">(runId),
        updatedAt: 0,
      },
    ],
    [
      "runs",
      {
        _id: id<"runs">(runId),
        _creationTime: 0,
        organizationId: "organization",
        status,
        createdAt: 0,
      },
    ],
  ]
}
