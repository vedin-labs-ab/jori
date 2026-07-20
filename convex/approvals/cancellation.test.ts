import { expect, test, vi } from "vitest"
import { type Doc, type Id, type TableNames } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type Actor } from "../shared/actor"
import { resolveCancellationActor } from "./cancellation"

test("resolves the cancellation actor from a user message in the run conversation", async () => {
  const actor = userActor()
  const ctx = cancellationCtx({
    message: message({ actor }),
    session: session(),
    conversation: conversation(),
  })

  await expect(
    resolveCancellationActor(ctx, {
      messageId: id<"messages">("message"),
      runId: id<"runs">("run"),
      organizationId: "organization",
    })
  ).resolves.toEqual(actor)
})

test("rejects cancellation messages outside the run conversation", async () => {
  const ctx = cancellationCtx({
    message: message({ conversationId: "other-conversation" }),
    session: session(),
    conversation: conversation(),
  })

  await expect(
    resolveCancellationActor(ctx, {
      messageId: id<"messages">("message"),
      runId: id<"runs">("run"),
      organizationId: "organization",
    })
  ).resolves.toBeNull()
})

test("rejects non-user cancellation messages", async () => {
  const ctx = cancellationCtx({
    message: message({ actor: { externalId: "UBOT", kind: "self" } }),
    session: session(),
    conversation: conversation(),
  })

  await expect(
    resolveCancellationActor(ctx, {
      messageId: id<"messages">("message"),
      runId: id<"runs">("run"),
      organizationId: "organization",
    })
  ).resolves.toBeNull()
})

function cancellationCtx(args: {
  message: Doc<"messages"> | null
  session: Doc<"sessions"> | null
  conversation: Doc<"conversations"> | null
}) {
  return {
    db: {
      get: vi.fn(async (recordId: string) => {
        if (recordId === "message") {
          return args.message
        }

        if (recordId === "conversation") {
          return args.conversation
        }

        return null
      }),
      query: vi.fn(() => ({
        withIndex: vi.fn(() => ({
          first: vi.fn(async () => args.session),
        })),
      })),
    },
  } as unknown as MutationCtx
}

function message(overrides: Partial<Doc<"messages">> = {}): Doc<"messages"> {
  return {
    _id: id<"messages">("message"),
    _creationTime: 0,
    organizationId: "organization",
    integrationId: id<"integrations">("integration"),
    integration: "slack",
    type: "message",
    externalId: "external-message",
    mentioned: false,
    actor: userActor(),
    conversationId: "conversation",
    text: "Cancel this approval.",
    createdAt: 0,
    ...overrides,
  }
}

function session(): Doc<"sessions"> {
  return {
    _id: id<"sessions">("session"),
    _creationTime: 0,
    conversationId: id<"conversations">("conversation"),
    runId: id<"runs">("run"),
    updatedAt: 0,
  }
}

function conversation(): Doc<"conversations"> {
  return {
    _id: id<"conversations">("conversation"),
    _creationTime: 0,
    organizationId: "organization",
    integrationId: id<"integrations">("integration"),
    externalId: "conversation",
    scope: "organization",
  }
}

function userActor(): Actor {
  return {
    kind: "person",
    externalId: "U123",
    name: "Albin",
  }
}

function id<TableName extends TableNames>(value: string) {
  return value as Id<TableName>
}
