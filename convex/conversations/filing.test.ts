import { expect, test, vi } from "vitest"
import { tableDoc } from "../../test/convex/collections"
import { databaseContext, type TestDatabase } from "../../test/convex/database"
import { folderDoc } from "../../test/convex/folders"
import { type Doc } from "../_generated/dataModel"
import { sendConsoleMessage } from "./console"

// Where a console conversation's runs are filed: under the folder the chat
// was opened from, or the one its resource is filed in. Starting a run
// hands it to the workflow component, which needs a real backend.
vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

const organizationId = "org"

test("a conversation opened from a folder files every run under it", async () => {
  const { database, ctx } = databaseContext()
  const personId = await person(database)
  const folderId = await database.insert("folders", folderDoc())

  const first = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Summarize this folder.",
    context: { kind: "folder", id: folderId },
  })
  await finishRun(database)
  const second = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    conversationId: first.conversationId,
    text: "Now draft the update.",
  })

  expect(second.conversationId).toBe(first.conversationId)
  expect(
    (await rows<Doc<"runs">>(database, "runs")).map((run) => run.folderId)
  ).toEqual([folderId, folderId])
})

test("a conversation opened from a filed table files its runs under the table's folder, and says so", async () => {
  const { database, ctx } = databaseContext()
  const personId = await person(database)
  const renewalsId = await database.insert(
    "folders",
    folderDoc({ name: "Renewals" })
  )
  const tableId = await database.insert(
    "collections",
    tableDoc({ folderId: renewalsId, name: "Customer renewals" })
  )

  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Which renewals are at risk?",
    context: { kind: "table", id: tableId },
  })
  const [run] = await rows<Doc<"runs">>(database, "runs")

  expect(await database.get(sent.messageId)).toMatchObject({
    data: { context: { kind: "table", id: tableId } },
  })
  expect(run).toMatchObject({
    folderId: renewalsId,
    snapshot: { context: [{ type: "table", label: "Customer renewals" }] },
  })
})

test("a context whose id is not of its kind is refused before anything is kept", async () => {
  const { database, ctx } = databaseContext()
  const personId = await person(database)

  await expect(
    sendConsoleMessage(ctx, {
      organizationId,
      personId,
      profile: {},
      text: "About this",
      context: { kind: "job", id: "not-an-id" },
    })
  ).rejects.toThrow("Context id is not a job.")
  expect(await rows(database, "messages")).toEqual([])
})

async function person(database: TestDatabase) {
  return await database.insert("persons", { organizationId })
}

async function finishRun(database: TestDatabase) {
  for (const run of await rows<Doc<"runs">>(database, "runs")) {
    await database.patch(run._id, { status: "completed" })
  }
}

async function rows<T>(database: TestDatabase, table: string) {
  return (await database
    .query(table)
    .withIndex("by_id")
    .collect()) as unknown as T[]
}
