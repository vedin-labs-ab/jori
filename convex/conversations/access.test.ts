import { expect, test, vi } from "vitest"
import { runDoc } from "../../test/convex/console"
import {
  consoleContext,
  organizationId,
  person,
} from "../../test/convex/conversations"
import { folderDoc } from "../../test/convex/materials/folders"
import { type Doc } from "../_generated/dataModel"
import { folderResources } from "../folders/resources"
import { runMatchesVisibilityFilter } from "../runs/console/filters"
import { canSeeRun } from "../runs/visibility"
import { loadTarget } from "../visibility/target"
import { createConsoleConversation } from "./console/create"
import { listConsoleConversations } from "./console/list"
import { findVisibleConsoleConversation } from "./resolve"

const paginationOpts = { cursor: null, numItems: 10 }

test("shared chats honor direct grants and every ancestor while owners retain access", async () => {
  const { database, ctx } = consoleContext()
  const owner = await person(database)
  const member = await person(database)
  const outsider = await person(database)
  const folderId = await database.insert(
    "folders",
    folderDoc({
      organizationId,
      createdBy: owner,
      visibility: { mode: "people", personIds: [member] },
    })
  )
  const chat = await createConsoleConversation(ctx, {
    organizationId,
    personId: owner,
    text: "Shared planning",
    now: 1,
  })
  await database.patch(chat._id, {
    folderId,
    visibility: { mode: "organization" },
    scope: "conversation",
  })
  const args = { organizationId, conversationId: chat._id }

  expect(
    await findVisibleConsoleConversation(ctx, { ...args, personId: member })
  ).not.toBeNull()
  expect(
    await findVisibleConsoleConversation(ctx, { ...args, personId: outsider })
  ).toBeNull()
  expect(
    await findVisibleConsoleConversation(ctx, { ...args, personId: owner })
  ).not.toBeNull()
  expect(
    await findVisibleConsoleConversation(ctx, {
      ...args,
      organizationId: "foreign",
      personId: owner,
    })
  ).toBeNull()
  expect(
    (
      await folderResources(ctx, { organizationId, personId: member, folderId })
    )[0]
  ).toMatchObject({ type: "chat", visibility: { mode: "organization" } })
  expect(
    (
      await listConsoleConversations(ctx, {
        organizationId,
        personId: member,
        paginationOpts,
      })
    ).page
  ).toMatchObject([{ id: chat._id }])
})

test("direct chat grants reuse the generic sharing target", async () => {
  const { database, ctx } = consoleContext()
  const owner = await person(database)
  const member = await person(database)
  const outsider = await person(database)
  const chat = await createConsoleConversation(ctx, {
    organizationId,
    personId: owner,
    text: "Planning",
    now: 1,
  })
  const args = { organizationId, conversationId: chat._id }
  await database.patch(chat._id, {
    folderId: undefined,
    visibility: { mode: "people", personIds: [outsider] },
  })
  expect(
    await findVisibleConsoleConversation(ctx, { ...args, personId: outsider })
  ).not.toBeNull()
  expect(
    await findVisibleConsoleConversation(ctx, { ...args, personId: member })
  ).toBeNull()
  const target = await loadTarget(ctx, organizationId, {
    kind: "chat",
    id: chat._id,
  })
  expect(target.gate.visibility).toEqual({
    mode: "people",
    personIds: [outsider],
  })
})

test("historical chat runs and navigation follow sharing and revocation immediately", async () => {
  const { database, ctx } = consoleContext()
  const owner = await person(database)
  const member = await person(database)
  const chat = await createConsoleConversation(ctx, {
    organizationId,
    personId: owner,
    text: "Private planning",
    now: 1,
  })
  const run = runDoc({
    organizationId,
    createdBy: owner,
    conversationId: chat._id,
    audience: "person",
  })
  expect(await canSeeRun(ctx, run, member)).toBe(false)
  await database.patch(chat._id, {
    visibility: { mode: "organization" },
    scope: "conversation",
  })
  expect(await canSeeRun(ctx, run, member)).toBe(true)
  expect(await runMatchesVisibilityFilter(ctx, run, "organization")).toBe(true)
  expect(
    (
      await listConsoleConversations(ctx, {
        organizationId,
        personId: member,
        paginationOpts,
      })
    ).page
  ).toHaveLength(1)
  await database.patch(chat._id, {
    visibility: { mode: "private" },
    scope: "person",
  })
  expect(await canSeeRun(ctx, run, member)).toBe(false)
  expect(await canSeeRun(ctx, run, owner)).toBe(true)
  expect(await runMatchesVisibilityFilter(ctx, run, "personal")).toBe(true)
  expect(
    (
      await listConsoleConversations(ctx, {
        organizationId,
        personId: member,
        paginationOpts,
      })
    ).page
  ).toEqual([])
  await database.delete(chat._id)
  expect(await canSeeRun(ctx, run, owner)).toBe(false)
})

test("provider conversations cannot become console sharing targets", async () => {
  const { database, ctx } = consoleContext()
  const id = await database.insert("conversations", {
    organizationId,
    surface: "slack",
    externalId: "thread",
    scope: "organization",
  })
  expect(
    await findVisibleConsoleConversation(ctx, {
      organizationId,
      conversationId: id,
      personId: undefined,
    })
  ).toBeNull()
  await expect(
    loadTarget(ctx, organizationId, { kind: "chat", id })
  ).rejects.toThrow("Not found.")
  const run = runDoc({
    organizationId,
    audience: "organization",
    conversationId: id,
  }) as Doc<"runs">
  expect(await canSeeRun(ctx, run, undefined)).toBe(true)
})

vi.mock("../discovery/sync/intent", () => ({ mark: vi.fn() }))
