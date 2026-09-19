import { expect, test, vi } from "vitest"
import {
  consoleContext,
  organizationId,
  person,
  rows,
} from "../../../test/convex/conversations"
import { tableDoc } from "../../../test/convex/materials/collections"
import { folderDoc } from "../../../test/convex/materials/folders"
import { sendConsoleMessage } from "./send"

vi.mock("../../runs/execution/workflow", () => ({ startRun: vi.fn() }))

test.each([false, true])(
  "inline references never choose the save folder (clear: %s)",
  async (clear) => {
    const { database, ctx } = consoleContext()
    const personId = await person(database)
    const sourceId = await database.insert(
      "folders",
      folderDoc({ name: "Source" })
    )
    const destinationId = await database.insert(
      "folders",
      folderDoc({ name: "Destination" })
    )
    const tableId = await database.insert(
      "collections",
      tableDoc({ folderId: sourceId })
    )
    const sent = await sendConsoleMessage(ctx, {
      organizationId,
      personId,
      profile: {},
      text: `Read +[table:${tableId}]`,
      folderId: clear ? undefined : destinationId,
      references: [{ kind: "table", id: tableId }],
    })
    const chat = await database.get(sent.conversationId)
    expect(chat?.folderId).toBe(clear ? undefined : destinationId)
    expect(chat?.visibility).toEqual({ mode: "private" })
    expect((await database.get(sent.messageId))?.data).toMatchObject({
      references: [{ kind: "table", id: tableId }],
    })
  }
)

test("creation rejects an inaccessible destination and send cannot move an existing chat", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const otherId = await person(database)
  const folderId = await database.insert(
    "folders",
    folderDoc({ createdBy: otherId, visibility: { mode: "private" } })
  )
  const args = {
    organizationId,
    personId,
    profile: {},
    text: "Private planning",
  }
  await expect(sendConsoleMessage(ctx, { ...args, folderId })).rejects.toThrow(
    "Folder was not found."
  )
  expect(await rows(database, "conversations")).toEqual([])
  const sent = await sendConsoleMessage(ctx, args)
  await expect(
    sendConsoleMessage(ctx, {
      ...args,
      conversationId: sent.conversationId,
      folderId,
    })
  ).rejects.toThrow("Move an existing chat using its folder controls.")
  expect((await database.get(sent.conversationId))?.folderId).toBeUndefined()
})

vi.mock("../../discovery/sync/intent", () => ({ mark: vi.fn() }))
