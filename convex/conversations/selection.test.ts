import { expect, test, vi } from "vitest"
import { defaultSelection } from "../../contracts/models/selection"
import {
  consoleContext,
  conversationOf,
  organizationId,
  person,
  rows,
} from "../../test/convex/conversations"
import { type TestDatabase } from "../../test/convex/database"
import { type Doc } from "../_generated/dataModel"
import { chooseConversationModel, sendConsoleMessage } from "./console"
import { readLiveState } from "./live"

// Starting a run hands it to the workflow component, which needs a real
// backend; these tests are about the selection a conversation carries.
vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

test("the first message carries the selection its conversation and run start on", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const premium = { model: "openai/gpt-6-astra", effort: "high" } as const

  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Think hard about this.",
    model: premium,
  })
  const [run] = await rows<Doc<"runs">>(database, "runs")

  expect(await database.get(sent.conversationId)).toMatchObject({
    model: premium,
  })
  expect(run).toMatchObject({ model: premium })
  expect(
    (await readLiveState(ctx, await conversationOf(database, sent))).model
  ).toEqual(premium)
})

test("choosing a model changes what the conversation's next run starts on", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const otherPersonId = await person(database)
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Start plain.",
  })
  const basic = { model: "openai/gpt-5.6-luna", effort: "max" } as const

  expect(await database.get(sent.conversationId)).not.toHaveProperty("model")
  expect(
    (await readLiveState(ctx, await conversationOf(database, sent))).model
  ).toEqual(defaultSelection)

  await expect(
    chooseConversationModel(ctx, {
      organizationId,
      conversationId: sent.conversationId,
      personId: otherPersonId,
      model: basic,
    })
  ).rejects.toThrow()

  await chooseConversationModel(ctx, {
    organizationId,
    conversationId: sent.conversationId,
    personId,
    model: basic,
  })
  await finishRun(database)
  await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    conversationId: sent.conversationId,
    text: "Now cheaper.",
  })

  const runs = await rows<Doc<"runs">>(database, "runs")

  expect(runs[0]).not.toHaveProperty("model")
  expect(runs[1]).toMatchObject({ model: basic })
  expect(
    (await readLiveState(ctx, await conversationOf(database, sent))).model
  ).toEqual(basic)
})

async function finishRun(database: TestDatabase) {
  for (const run of await rows<Doc<"runs">>(database, "runs")) {
    await database.patch(run._id, { status: "completed" })
  }
}
