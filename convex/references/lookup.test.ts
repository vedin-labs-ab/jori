import { expect, test } from "vitest"
import { tableDoc, testOwner } from "../../test/convex/collections"
import { databaseContext } from "../../test/convex/database"
import { fileDoc } from "../../test/convex/folders"
import { type Id } from "../_generated/dataModel"
import {
  consoleReferenceLine,
  normalizeConsoleReferences,
  resolveConsoleReferences,
  resolveReferenceTarget,
} from "../messages/references"
import { createSight } from "../visibility/sight"

const other = "persons:other" as Id<"persons">

async function seed() {
  const { database, ctx } = databaseContext()
  const tableId = await database.insert(
    "collections",
    tableDoc({ name: "Customer renewals" })
  )
  const secretId = await database.insert(
    "files",
    fileDoc({ name: "secret.csv", visibility: { mode: "private" } })
  )
  const chatId = await database.insert("conversations", {
    organizationId: "org",
    surface: "console",
    externalId: "",
    scope: "person",
    title: "Which renewals are at risk?",
    createdBy: testOwner,
    updatedAt: 1,
  })
  const sightOf = (personId: Id<"persons">) =>
    createSight(ctx, { organizationId: "org", personId })

  return { chatId, ctx, secretId, sightOf, tableId }
}

test("a chat resolves for the person whose it is, and for nobody else", async () => {
  const { chatId, ctx, sightOf } = await seed()
  const target = { kind: "chat", id: chatId } as const

  expect(await resolveReferenceTarget(ctx, sightOf(testOwner), target)).toEqual(
    {
      ...target,
      name: "Which renewals are at risk?",
      detail: "Chat",
      unavailable: false,
    }
  )
  expect(
    await resolveReferenceTarget(ctx, sightOf(other), target)
  ).toMatchObject({ unavailable: true })
})

test("a message's mentions are kept once each, in their own tables, and only when the sender can see them", async () => {
  const { ctx, secretId, sightOf, tableId } = await seed()

  expect(
    await normalizeConsoleReferences(ctx, sightOf(other), [
      { kind: "table", id: tableId },
      { kind: "table", id: tableId },
    ])
  ).toEqual([{ kind: "table", id: tableId }])
  await expect(
    normalizeConsoleReferences(ctx, sightOf(other), [
      { kind: "file", id: secretId },
    ])
  ).rejects.toThrow("The mentioned file is not available.")
  await expect(
    normalizeConsoleReferences(ctx, sightOf(other), [
      { kind: "job", id: "not-an-id" },
    ])
  ).rejects.toThrow("The mentioned job is not available.")
})

test("the model's lines name each mention by its token, its name, and the id its tools take", async () => {
  const { ctx, secretId, sightOf, tableId } = await seed()
  const references = await resolveConsoleReferences(ctx, sightOf(other), {
    references: [
      { kind: "table", id: tableId },
      { kind: "file", id: secretId },
      { kind: "video", id: "x" },
    ],
  })

  expect(references.map(consoleReferenceLine)).toEqual([
    `+[table:${tableId}] mentions table «Customer renewals» (tableId: ${tableId})`,
    `+[file:${secretId}] mentions a file that is no longer available (fileId: ${secretId})`,
  ])
  expect(
    consoleReferenceLine({ kind: "chat", id: "c1", name: "Renewals" })
  ).toBe("+[chat:c1] mentions chat «Renewals» (conversationId: c1)")
})
