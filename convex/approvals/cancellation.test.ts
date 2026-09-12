import { expect, test } from "vitest"
import { databaseContext, id } from "../../test/convex/database"
import { type Doc } from "../_generated/dataModel"
import { resolveCancellationActor } from "./cancellation"

const actor = { kind: "person" as const, externalId: "U123", name: "Albin" }

test.each<{
  scenario: string
  message: Partial<Doc<"messages">>
  expected: typeof actor | null
}>([
  { scenario: "the run's user message", message: {}, expected: actor },
  {
    scenario: "a message outside the run conversation",
    message: { conversationId: "other-conversation" },
    expected: null,
  },
  {
    scenario: "a non-user message",
    message: { actor: { externalId: "UBOT", kind: "self" } },
    expected: null,
  },
])(
  "resolves the cancellation actor for $scenario",
  async ({ message, expected }) => {
    const { database, ctx } = databaseContext()
    const organizationId = "organization"
    const integrationId = id<"integrations">("integration")
    const runId = id<"runs">("run")
    const conversationId = await database.insert("conversations", {
      organizationId,
      integrationId,
      externalId: "conversation",
    })
    await database.insert("sessions", { conversationId, runId })
    const messageId = await database.insert("messages", {
      organizationId,
      integrationId,
      conversationId: "conversation",
      actor,
      ...message,
    })

    await expect(
      resolveCancellationActor(ctx, { messageId, runId, organizationId })
    ).resolves.toEqual(expected)
  }
)
