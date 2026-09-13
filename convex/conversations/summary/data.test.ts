import { expect, test } from "vitest"
import { databaseContext, id } from "../../../test/convex/database"
import { type Doc } from "../../_generated/dataModel"
import { summarySourceMessageLimit } from "../limits"
import { loadSummaryMessages } from "./data"

test("loads all source messages for small conversations", async () => {
  const messages = await loadSummaryMessages(
    await seeded(summarySourceMessageLimit),
    conversation()
  )

  expect(texts(messages)).toEqual(messageNumbers(1, summarySourceMessageLimit))
})

test.each([
  [100.5, messageNumbers(76, 120)],
  [100, [...messageNumbers(75, 99), ...messageNumbers(101, 120)]],
] as const)(
  "loads overlap and new messages strictly around watermark %s",
  async (summarizedAt, expected) => {
    const messages = await loadSummaryMessages(
      await seeded(120),
      conversation({ summarizedAt })
    )

    expect(texts(messages)).toEqual(expected)
  }
)

test("prioritizes new messages over overlap within the source limit", async () => {
  const messages = await loadSummaryMessages(
    await seeded(150),
    conversation({ summarizedAt: 60.5 })
  )

  expect(texts(messages)).toEqual(messageNumbers(51, 150))
})

/** The thread's messages, numbered 1 to `count`, each created at its
 *  number. */
async function seeded(count: number) {
  const { database, ctx } = databaseContext()

  for (let number = 1; number <= count; number += 1) {
    await database.insert("messages", {
      organizationId: "organization",
      integrationId: id<"integrations">("integration"),
      surface: "slack",
      type: "message.channels",
      externalId: `message-${number}`,
      mentioned: true,
      actor: { externalId: "U123", kind: "person", name: "Albin" },
      conversationId: "conversation",
      text: `Message ${number}`,
      createdAt: number,
    })
  }

  return ctx
}

function conversation(
  overrides: Partial<Doc<"conversations">> = {}
): Doc<"conversations"> {
  return {
    _id: id<"conversations">("conversation"),
    _creationTime: 0,
    organizationId: "organization",
    surface: "slack",
    integrationId: id<"integrations">("integration"),
    externalId: "conversation",
    scope: "organization",
    ...overrides,
  }
}

function messageNumbers(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    return `Message ${start + index}`
  })
}

function texts(messages: Array<{ text: string }>) {
  return messages.map((message) => message.text)
}
