import { expect, test, vi } from "vitest"
import {
  fakeMutationCtx,
  inserted,
  type Seed,
} from "../../test/convex/conversations"
import { id } from "../../test/convex/database"
import { type Doc, type Id } from "../_generated/dataModel"
import { startRun } from "../runs/execution/workflow"
import { startMessageRun } from "./data"

// Starting a run hands it to the workflow component, which needs a real
// backend; these tests are about the rows the start writes.
vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

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

test("console runs carry no integration and file under the opening folder", async () => {
  const conversation = consoleConversationDoc()
  const opening = {
    ...message("Summarize this folder."),
    _id: id<"messages">("message-opening"),
    surface: "console" as const,
    integrationId: undefined,
    conversationId: conversation.externalId,
    data: { context: { kind: "folder", id: "folder-1" } },
    createdAt: 100,
  }
  const ctx = fakeMutationCtx([
    ["conversations", conversation],
    ["messages", opening],
  ])

  const result = await startMessageRun(ctx, {
    conversation,
    integration: null,
    message: {
      ...message("Now draft the update."),
      surface: "console",
      integrationId: undefined,
      conversationId: conversation.externalId,
    },
    createdBy: "person" as Id<"persons">,
    externalId: conversation.externalId,
    now: 1000,
  })

  expect(result.status).toBe("started")
  expect(inserted(ctx, "conversations")).toEqual([])
  expect(inserted(ctx, "runs")).toEqual([
    expect.objectContaining({
      audience: "person",
      conversationId: conversation._id,
      folderId: "folder-1",
      principal: { kind: "person", personId: "person" },
      snapshot: expect.objectContaining({
        source: { type: "message", surface: "jori" },
      }),
    }),
  ])
})

function consoleConversationDoc(): Doc<"conversations"> {
  return {
    _id: id<"conversations">("conversation-doc"),
    _creationTime: 0,
    organizationId: "organization",
    surface: "console",
    externalId: "conversation-doc",
    scope: "person",
    createdBy: "person" as Id<"persons">,
    updatedAt: 0,
  }
}

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
    integration: integration(),
    message: message("Please help."),
    createdBy: "person" as Id<"persons">,
    externalId: "conversation",
    now: 1000,
    ...overrides,
  }
}

function integration() {
  return {
    _id: id<"integrations">("integration"),
    _creationTime: 0,
    organizationId: "organization",
    integration: "slack",
    scope: "organization",
    externalId: "team",
    credentials: {},
    status: "active",
    createdBy: "person" as Id<"persons">,
    createdAt: 0,
    updatedAt: 0,
  } as Parameters<typeof startMessageRun>[1]["integration"]
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
