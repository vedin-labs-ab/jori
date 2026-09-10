import { expect, test, vi } from "vitest"
import { catalogModel } from "../../contracts/models/catalog"
import { defaultSelection } from "../../contracts/models/selection"
import {
  consoleContext,
  conversationOf,
  organizationId,
  person,
  rows,
} from "../../test/convex/conversations"
import { type Doc, type Id } from "../_generated/dataModel"
import { sendConsoleMessage } from "./console"
import { readLiveState } from "./live"

// Starting a run hands it to the workflow component, which needs a real
// backend; these tests are about what the thread reads back.
vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

test("reports the session's run, and how it ended when it did not finish", async () => {
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
    context: emptyContext(run._id),
    model: defaultSelection,
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
    model: defaultSelection.model,
    contextLength: 200_000,
    rate: catalogModel(defaultSelection.model).rate,
    fetchedAt: 1,
  })

  const expected = {
    condensed: false,
    model: defaultSelection.model,
    runId: run._id,
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
    context: expected,
    model: defaultSelection,
  })

  // A run that condensed its transcript says so; a clearing that found
  // nothing old enough to clear does not.
  await database.patch(run._id, { compaction: { clearedAtTurn: 6 } })

  expect((await readLiveState(ctx, live)).context?.condensed).toBe(false)

  await database.patch(run._id, {
    compaction: { clearedAtTurn: 6, clearedBefore: 8 },
  })

  expect((await readLiveState(ctx, live)).context?.condensed).toBe(true)
})

test("a thread with no run yet has no context to show", async () => {
  const { database, ctx } = consoleContext()
  const conversationId = await database.insert("conversations", {
    organizationId,
    surface: "console",
    visibility: { mode: "private" },
    externalId: "",
    scope: "person",
    createdBy: await person(database),
    updatedAt: 0,
  })

  expect(
    await readLiveState(ctx, await conversationOf(database, { conversationId }))
  ).toEqual({ run: null, context: null, model: defaultSelection })
})

function emptyContext(runId: Id<"runs">) {
  return {
    condensed: false,
    model: defaultSelection.model,
    runId,
    turn: null,
    usedTokens: 0,
    windowTokens: catalogModel(defaultSelection.model).contextLength,
  }
}
