import { expect, test, vi } from "vitest"
import {
  fakeMutationCtx,
  inserted,
  type Seed,
} from "../../test/convex/conversations"
import { id } from "../../test/convex/database"
import { type Doc, type Id } from "../_generated/dataModel"
import { startMessageRun } from "./data"

// Starting a run hands it to the workflow component, which needs a real
// backend; these tests are about the rows the start writes.
vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

test("starts reply runs when a waiter wake never resumed the run", async () => {
  const currentConversation = conversation()
  const ctx = fakeMutationCtx([
    ["conversations", currentConversation],
    session(currentConversation, "stale-run"),
    run("stale-run", "running", 0),
    waiter("stale-run", "woken", 1000),
    trace("stale-run", 500),
  ])

  const result = await startMessageRun(ctx, {
    ...runArgs({ now: 10 * 60 * 1000 }),
    conversation: currentConversation,
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

type StartArgs = Parameters<typeof startMessageRun>[1]

function runArgs(overrides: Partial<StartArgs> = {}): StartArgs {
  return {
    createdBy: "person" as Id<"persons">,
    externalId: "conversation",
    integration: integration(),
    message: message(),
    now: 1000,
    conversation: null,
    ...overrides,
  }
}

function conversation(): Doc<"conversations"> {
  return {
    _creationTime: 0,
    _id: id<"conversations">("conversation"),
    externalId: "conversation",
    integrationId: id<"integrations">("integration"),
    organizationId: "organization",
    scope: "organization",
  }
}

function integration(): StartArgs["integration"] {
  return {
    _creationTime: 0,
    _id: id<"integrations">("integration"),
    createdAt: 0,
    createdBy: "person" as Id<"persons">,
    credentials: {},
    externalId: "team",
    integration: "slack",
    scope: "organization",
    status: "active",
    organizationId: "organization",
    updatedAt: 0,
  }
}

function message(): StartArgs["message"] {
  return {
    _creationTime: 0,
    _id: id<"messages">("message"),
    createdAt: 900,
    externalId: "slack:message",
    integration: "slack",
    integrationId: id<"integrations">("integration"),
    mentioned: false,
    conversationId: "conversation",
    organizationId: "organization",
    text: "Still there?",
    type: "message.channels",
  }
}

function session(
  currentConversation: Doc<"conversations">,
  runId: string
): Seed {
  return [
    "sessions",
    {
      _creationTime: 0,
      _id: id<"sessions">("session"),
      runId: id<"runs">(runId),
      updatedAt: 0,
      conversationId: currentConversation._id,
    },
  ]
}

function run(
  runId: string,
  status: "completed" | "running",
  createdAt: number
): Seed {
  return [
    "runs",
    {
      _creationTime: 0,
      _id: id<"runs">(runId),
      createdAt,
      status,
      organizationId: "organization",
    },
  ]
}

function waiter(
  runId: string,
  status: "waiting" | "woken",
  updatedAt: number
): Seed {
  return [
    "waiters",
    {
      _creationTime: updatedAt,
      _id: id<"waiters">("waiter"),
      createdAt: updatedAt,
      expiresAt: updatedAt + 1000,
      runId: id<"runs">(runId),
      status,
      organizationId: "organization",
      updatedAt,
      eventId: "event",
    },
  ]
}

function trace(runId: string, timestamp: number): Seed {
  return [
    "traces",
    {
      _creationTime: timestamp,
      _id: id<"traces">("trace"),
      key: `trace:${runId}:${timestamp}`,
      runId: id<"runs">(runId),
      organizationId: "organization",
      timestamp,
      type: "run.started",
    },
  ]
}
