import { expect, test, vi } from "vitest"
import {
  consoleContext,
  organizationId,
  person,
} from "../../test/convex/conversations"
import { tableDoc } from "../../test/convex/materials/collections"
import { folderDoc } from "../../test/convex/materials/folders"
import { sendConsoleMessage } from "../conversations/console/send"
import { fileResource } from "../folders/filing"
import { formatSessionMessage } from "../runtime/loop/transcript"
import { formatSessionMessages } from "./messages"

vi.mock("../runs/execution/workflow", () => ({ startRun: vi.fn() }))

test("follow-ups carry the current folder and inline names even when the session is already running", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const folderId = await database.insert(
    "folders",
    folderDoc({ name: "Renewals" })
  )
  const tableId = await database.insert(
    "collections",
    tableDoc({ name: "Customer renewals" })
  )
  const args = { organizationId, personId, profile: {} }
  const first = await sendConsoleMessage(ctx, {
    ...args,
    text: "Plan the renewals",
    folderId,
  })
  const followed = await sendConsoleMessage(ctx, {
    ...args,
    conversationId: first.conversationId,
    text: `Read +[table:${tableId}]`,
    references: [{ kind: "table", id: tableId }],
  })
  const message = await ctx.db.get(followed.messageId)
  if (message === null) {
    throw new Error("Missing message")
  }
  const [formatted] = await formatSessionMessages(ctx, first.conversationId, [
    message,
  ])
  expect(formatSessionMessage(formatted)).toContain(
    `Working in folder «Renewals» (folderId: ${folderId})`
  )
  expect(formatted.context).toContain(
    `+[table:${tableId}] mentions table «Customer renewals»`
  )
  await fileResource(ctx, {
    organizationId,
    personId,
    resourceType: "chat",
    resourceId: first.conversationId,
    folderId: null,
  })
  const cleared = await sendConsoleMessage(ctx, {
    ...args,
    conversationId: first.conversationId,
    text: "Continue outside the folder",
  })
  const next = await ctx.db.get(cleared.messageId)
  if (next === null) {
    throw new Error("Missing message")
  }
  const [root] = await formatSessionMessages(ctx, first.conversationId, [next])
  expect(root.context).toBe("Working outside any folder.")
})

test("follow-up context resolves against current access rather than stored resource names", async () => {
  const { database, ctx } = consoleContext()
  const personId = await person(database)
  const otherId = await person(database)
  const tableId = await database.insert(
    "collections",
    tableDoc({ ownerId: otherId, name: "Private renewal strategy" })
  )
  const sent = await sendConsoleMessage(ctx, {
    organizationId,
    personId,
    profile: {},
    text: `Read +[table:${tableId}]`,
    references: [{ kind: "table", id: tableId }],
  })
  await database.patch(tableId, { visibility: { mode: "private" } })
  const message = await ctx.db.get(sent.messageId)
  if (message === null) {
    throw new Error("Missing message")
  }
  const [formatted] = await formatSessionMessages(ctx, sent.conversationId, [
    message,
  ])
  expect(formatted.context).not.toContain("Private renewal strategy")
  expect(formatted.context).toContain("no longer available")
})

vi.mock("../discovery/sync/intent", () => ({ mark: vi.fn() }))
