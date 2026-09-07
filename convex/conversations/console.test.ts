import { expect, test, vi } from "vitest"
import { defaultSelection } from "../../contracts/models/selection"
import { tableDoc } from "../../test/convex/collections"
import {
  consoleContext,
  conversationOf,
  finishRun,
  organizationId,
  person,
  rows,
} from "../../test/convex/conversations"
import { type Doc } from "../_generated/dataModel"
import { listConsoleConversations, sendConsoleMessage } from "./console"
import { readLiveState } from "./live"
import { findVisibleConsoleConversation } from "./resolve"

// Starting a run hands it to the workflow component, which needs a real
// backend; these tests are about the rows a console message writes.
vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

const paginationOpts = { cursor: null, numItems: 10 }

test("the first message opens a person-scoped conversation and starts a run", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)

  const result = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: { name: "Albin" },
    text: "\nPlan the launch\nWith three milestones.",
  })

  expect(result.status).toBe("started")

  const conversation = await database.get(result.conversationId)
  const message = await database.get(result.messageId)
  const [run] = await rows<Doc<"runs">>(database, "runs")

  expect(conversation).toMatchObject({
    surface: "console",
    scope: "person",
    externalId: result.conversationId,
    title: "Plan the launch",
    createdBy: personId,
  })
  expect(conversation).not.toHaveProperty("integrationId")
  expect(message).toMatchObject({
    surface: "console",
    type: "console.message",
    mentioned: true,
    conversationId: result.conversationId,
    actor: { kind: "person", personId, name: "Albin" },
    personId,
    text: "Plan the launch\nWith three milestones.",
  })
  expect(message).not.toHaveProperty("integrationId")
  expect(run).toMatchObject({
    organizationId,
    audience: "person",
    conversationId: result.conversationId,
    cause: { type: "message", messageId: result.messageId, kind: "mention" },
    principal: { kind: "person", personId },
    snapshot: {
      title: "Plan the launch",
      source: { type: "message", surface: "jori" },
      context: [],
    },
  })
  expect(run).not.toHaveProperty("folderId")
})

test("an answer to a reply's choices travels with the message", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const first = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Post the summary?",
  })
  await finishRun(database)
  const answer = {
    messageId: first.messageId,
    answers: [{ part: 0, values: ["post"] }],
  }

  const second = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    conversationId: first.conversationId,
    text: "Yes, post it",
    answer,
  })

  expect(await database.get(second.messageId)).toMatchObject({
    text: "Yes, post it",
    data: { answer },
  })
})

test("a blocked budget keeps the message without a run", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)

  await database.insert("accounts", {
    organizationId,
    state: { kind: "paused" },
    micros: { allowance: 0, wallet: 0 },
    topUp: { charged: { micros: 0 } },
    updatedAt: 0,
  })

  const result = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Anyone there?",
  })

  expect(result.status).toBe("blocked")
  expect(await database.get(result.messageId)).not.toBeNull()
  expect(await rows(database, "runs")).toEqual([])
  expect(
    await readLiveState(ctx, await conversationOf(database, result))
  ).toEqual({ run: null, context: null, model: defaultSelection })
})

test("lists a person's own conversations, most recently active first", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const otherPersonId = await person(database)

  vi.useFakeTimers()
  vi.setSystemTime(1_000)
  const older = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Older",
  })
  vi.setSystemTime(2_000)
  const newer = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Newer",
  })
  vi.setSystemTime(3_000)
  await sendConsoleMessage(ctx, {
    organizationId,
    personId: otherPersonId,
    profile: {},
    text: "Someone else's",
  })
  vi.useRealTimers()

  const result = await listConsoleConversations(ctx, {
    organizationId,
    personId,
    paginationOpts,
  })

  expect(result.page).toEqual([
    { id: newer.conversationId, title: "Newer", updatedAt: 2_000 },
    { id: older.conversationId, title: "Older", updatedAt: 1_000 },
  ])
})

test("only the creator sees a console conversation", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const otherPersonId = await person(database)
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Private thought.",
  })
  const args = { conversationId: sent.conversationId, organizationId }

  expect(
    await findVisibleConsoleConversation(ctx, { ...args, personId })
  ).toMatchObject({ _id: sent.conversationId })
  expect(
    await findVisibleConsoleConversation(ctx, {
      ...args,
      personId: otherPersonId,
    })
  ).toBeNull()
  expect(
    await findVisibleConsoleConversation(ctx, {
      ...args,
      organizationId: "other-org",
      personId,
    })
  ).toBeNull()
  await expect(
    sendConsoleMessage(ctx, {
      organizationId,
      personId: otherPersonId,
      profile: {},
      conversationId: sent.conversationId,
      text: "Let me in.",
    })
  ).rejects.toThrow("Conversation not found.")
})
test("every message that runs schedules the thread's summary", async () => {
  const { database, ctx, scheduler } = consoleContext()
  const personId = await person(database)
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Rename the renewals table.",
  })

  expect(scheduler.runAt).toHaveBeenCalledTimes(1)
  expect((await conversationOf(database, sent)).debounce).toMatchObject({
    functionId: "scheduled_1",
  })
})

test("the resources a message mentions are kept with it, once each, and one the person cannot see refuses the message", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  // Named the way a token's grammar takes an id, as a real id is.
  const tableId = await database.insert("collections", {
    ...tableDoc({ name: "Customer renewals", organizationId }),
    _id: "k17renewals",
  })
  const privateId = await database.insert(
    "collections",
    tableDoc({
      name: "Owner's own",
      organizationId,
      visibility: { mode: "private" },
    })
  )

  const result = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    references: [
      { kind: "table", id: tableId },
      { kind: "table", id: tableId },
    ],
    text: `Look at +[table:${tableId}]`,
  })

  expect(await database.get(result.messageId)).toMatchObject({
    data: { references: [{ kind: "table", id: tableId }] },
  })
  // The title and the run read the mention by its name.
  expect(await database.get(result.conversationId)).toMatchObject({
    title: "Look at Customer renewals",
  })
  await expect(
    sendConsoleMessage(ctx, {
      organizationId,
      personId,
      profile: {},
      references: [{ kind: "table", id: privateId }],
      text: "Look at that",
    })
  ).rejects.toThrow("The mentioned table is not available.")
})
