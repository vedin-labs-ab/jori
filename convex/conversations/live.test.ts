import { expect, test, vi } from "vitest"
import { joriModel, modelContextFallback } from "../../contracts/billing"
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
import { readLiveState } from "./live"

// Starting a run hands it to the workflow component, which needs a real
// backend; these tests are about what the thread reads back.
vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

const emptyContext = {
  model: joriModel,
  turn: null,
  usedTokens: 0,
  windowTokens: modelContextFallback.contextLength,
}

test("reports the session's run and the reply it is drafting", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Go.",
  })
  const [run] = await rows<Doc<"runs">>(database, "runs")
  const live = await conversationOf(database, sent)

  expect(await readLiveState(ctx, live)).toEqual({
    run: { id: run._id, status: "queued" },
    draft: null,
    context: emptyContext,
  })

  const draft = { reasoning: "Reading the notes.", text: "On it" }

  await writeRunDraft(ctx, { ...draft, runId: run._id, turn: 1 })

  expect(await readLiveState(ctx, live)).toEqual({
    run: { id: run._id, status: "queued" },
    draft,
    context: emptyContext,
  })

  // A run that did not finish says how it ended, so the thread can.
  await database.patch(run._id, {
    status: "failed",
    error: "Sandbox timed out",
    endedAt: 5_000,
  })

  expect((await readLiveState(ctx, live)).run).toEqual({
    id: run._id,
    status: "failed",
    error: "Sandbox timed out",
    endedAt: 5_000,
  })
})

test("the thread's context use reads off its latest run, even once the session let it go", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Go.",
  })
  const [run] = await rows<Doc<"runs">>(database, "runs")
  const live = await conversationOf(database, sent)

  await database.patch(run._id, {
    promptTokens: 61_000,
    turnTokens: {
      cacheRead: 40_000,
      input: 61_000,
      output: 900,
      reasoning: 300,
    },
  })
  await database.insert("models", {
    model: joriModel,
    contextLength: 200_000,
    fetchedAt: 1,
  })

  const expected = {
    model: joriModel,
    turn: { cached: 40_000, input: 61_000, output: 900, reasoning: 300 },
    usedTokens: 61_000,
    windowTokens: 200_000,
  }

  expect((await readLiveState(ctx, live)).context).toEqual(expected)

  // The session moves on when the run ends; the thread's context stays
  // readable from the run that last spoke.
  const [session] = await rows<Doc<"sessions">>(database, "sessions")

  await database.patch(session._id, { runId: undefined })

  expect(await readLiveState(ctx, live)).toEqual({
    run: null,
    draft: null,
    context: expected,
  })
})

test("a thread with no run yet has no context to show", async () => {
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
    await readLiveState(ctx, await conversationOf(database, { conversationId }))
  ).toEqual({ run: null, draft: null, context: null })
})
