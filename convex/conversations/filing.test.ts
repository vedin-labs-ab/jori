import { expect, test, vi } from "vitest"
import { tableDoc } from "../../test/convex/collections"
import {
  consoleContext,
  finishRun,
  organizationId,
  person,
  rows,
} from "../../test/convex/conversations"
import { type TestDatabase } from "../../test/convex/database"
import { folderDoc } from "../../test/convex/folders"
import { type Doc, type Id } from "../_generated/dataModel"
import { folderChildren } from "../folders/contents"
import { fileResource } from "../folders/filing"
import { folderResources } from "../folders/resources"
import { sendConsoleMessage } from "./console"

// Where a console conversation's runs are filed: under the folder the chat
// was opened from, or the one its resource is filed in. Starting a run
// hands it to the workflow component, which needs a real backend.
vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

test("a conversation opened from a folder files every run under it", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const folderId = await database.insert("folders", folderDoc())

  const first = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Summarize this folder.",
    folderId,
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
  expect(await rows<Doc<"runs">>(database, "runs")).toEqual(
    [first, second].map((sent) =>
      expect.objectContaining({
        audience: "person",
        conversationId: first.conversationId,
        folderId,
        principal: { kind: "person", personId },
        cause: expect.objectContaining({ messageId: sent.messageId }),
        snapshot: expect.objectContaining({
          source: { type: "message", surface: "jori" },
          context: [{ type: "folder", label: "Projects" }],
        }),
      })
    )
  )
})

test("a new chat is private in its chosen folder and mentions its entry table independently", async () => {
  const { database, ctx } = consoleContext()
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
    text: `Which entries in +[table:${tableId}] need attention?`,
    folderId: renewalsId,
    references: [{ kind: "table", id: tableId }],
  })
  const [run] = await rows<Doc<"runs">>(database, "runs")

  expect(await database.get(sent.messageId)).toMatchObject({
    data: {
      context: { kind: "folder", id: renewalsId },
      references: [{ kind: "table", id: tableId }],
    },
  })
  expect(await database.get(sent.conversationId)).toMatchObject({
    folderId: renewalsId,
    visibility: { mode: "private" },
  })
  expect(run).toMatchObject({
    folderId: renewalsId,
    snapshot: { context: [{ type: "folder", label: "Renewals" }] },
  })
})

test("an invalid inline reference is refused before anything is kept", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)

  await expect(
    sendConsoleMessage(ctx, {
      organizationId,
      personId,
      profile: {},
      text: "About this",
      references: [{ kind: "job", id: "not-an-id" }],
    })
  ).rejects.toThrow("The mentioned job is not available.")
  expect(await rows(database, "messages")).toEqual([])
})

test("unfiling a contextual chat keeps later runs unfiled", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const folderId = await database.insert("folders", folderDoc())
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Plan this folder.",
    folderId,
  })
  expect(await database.get(sent.conversationId)).toMatchObject({ folderId })

  await fileResource(ctx, {
    organizationId,
    personId,
    resourceType: "chat",
    resourceId: sent.conversationId,
    folderId: null,
  })
  await finishRun(database)
  const next = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Keep going.",
    conversationId: sent.conversationId,
  })

  expect((await database.get(next.messageId))?.data).toBeUndefined()
  expect((await database.get(sent.conversationId))?.folderId).toBeUndefined()
  expect(
    (await rows<Doc<"runs">>(database, "runs")).map((run) => run.folderId)
  ).toEqual([undefined, undefined])
})

test("filing a chat does not expose it to other folder viewers", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const otherId = await person(database)
  const unrelatedId = await person(database)
  const folderId = await database.insert("folders", folderDoc())
  await seedPrivateChats(database, folderId, unrelatedId)
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: "Private launch planning.",
  })
  const filing = {
    organizationId,
    resourceType: "chat" as const,
    resourceId: sent.conversationId,
    folderId,
  }

  await expect(
    fileResource(ctx, { ...filing, personId: otherId })
  ).rejects.toThrow("Resource was not found.")
  await fileResource(ctx, { ...filing, personId })

  const view = { organizationId, folderId }
  expect(await folderResources(ctx, { ...view, personId })).toMatchObject([
    {
      type: "chat",
      id: sent.conversationId,
      ownerId: personId,
      visibility: { mode: "private" },
    },
  ])
  expect(await folderResources(ctx, { ...view, personId: otherId })).toEqual([])
  const ownFolders = await folderChildren(ctx, {
    organizationId,
    personId,
    parentId: undefined,
  })
  const otherFolders = await folderChildren(ctx, {
    organizationId,
    personId: otherId,
    parentId: undefined,
  })
  expect(ownFolders[0]?.resourceCount).toBe(1)
  expect(otherFolders[0]?.resourceCount).toBe(0)
})

async function seedPrivateChats(
  database: TestDatabase,
  folderId: Id<"folders">,
  unrelatedId: Id<"persons">
) {
  for (let index = 0; index < 200; index += 1) {
    await database.insert("conversations", {
      organizationId,
      folderId,
      surface: "console",
      visibility: { mode: "private" },
      scope: "person",
      createdBy: unrelatedId,
      title: "Another person's chat",
      externalId: String(index),
    })
  }
}
