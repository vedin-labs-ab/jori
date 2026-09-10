import { expect, test } from "vitest"
import { databaseContext, id } from "../../../test/convex/database"
import { loadRecentActivity } from "./load"

/** A shared run must not gain access to private context through its sender. */
test("recent console context respects current visibility and execution audience", async () => {
  const { ctx, database } = databaseContext()
  const personId = id<"persons">("sender")
  const conversationId = await database.insert("conversations", {
    organizationId: "org",
    surface: "console",
    externalId: "chat",
    createdBy: personId,
    scope: "person",
    visibility: { mode: "private" },
    summary: "Private planning",
    summarizedAt: 1,
  })
  await database.insert("messages", {
    organizationId: "org",
    surface: "console",
    externalId: "message",
    type: "console.message",
    personId,
    conversationId: "chat",
    createdAt: 1,
    text: "Personal context",
  })
  const args = {
    organizationId: "org",
    personId,
    now: 2,
    seen: [],
    run: {
      audience: "conversation" as const,
      personId,
      conversationId: undefined,
    },
  }
  expect(await loadRecentActivity(ctx, args)).toEqual([])
  expect(
    await loadRecentActivity(ctx, {
      ...args,
      run: { ...args.run, audience: "person" },
    })
  ).toHaveLength(1)
  await database.patch(conversationId, {
    visibility: { mode: "organization" },
    scope: "conversation",
  })
  expect(await loadRecentActivity(ctx, args)).toHaveLength(1)
  const folderId = await database.insert("folders", {
    organizationId: "org",
    name: "Private",
    createdBy: personId,
    visibility: { mode: "private" },
    updatedAt: 1,
  })
  await database.patch(conversationId, { folderId })
  expect(await loadRecentActivity(ctx, args)).toEqual([])
})
