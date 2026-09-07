import { expect, test, vi } from "vitest"
import {
  consoleContext,
  conversationOf,
  organizationId,
  person,
  rows,
} from "../../test/convex/conversations"
import { type Doc } from "../_generated/dataModel"
import { writeRunDraft } from "../runs/execution/drafts/data"
import { sendConsoleMessage } from "./console"
import { readConversationDraft } from "./draft"

// Starting a run hands it to the workflow component, which needs a real
// backend; these tests are about what the thread reads back.
vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

test("reads the reply the session's run is drafting, and nothing once the session lets the run go", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Go.",
  })
  const [run] = await rows<Doc<"runs">>(database, "runs")
  const conversation = await conversationOf(database, sent)

  expect(await readConversationDraft(ctx, conversation)).toBeNull()

  const draft = { reasoning: "Reading the notes.", text: "On it" }

  await writeRunDraft(ctx, { ...draft, runId: run._id, turn: 1 })

  expect(await readConversationDraft(ctx, conversation)).toEqual(draft)

  const [session] = await rows<Doc<"sessions">>(database, "sessions")

  await database.patch(session._id, { runId: undefined })

  expect(await readConversationDraft(ctx, conversation)).toBeNull()
})

test("a thread with no session yet has no draft", async () => {
  const { database, ctx } = consoleContext()
  const conversationId = await database.insert("conversations", {
    organizationId,
    surface: "console",
    externalId: "",
    scope: "person",
    createdBy: await person(database),
    updatedAt: 0,
  })

  expect(
    await readConversationDraft(
      ctx,
      await conversationOf(database, { conversationId })
    )
  ).toBeNull()
})
