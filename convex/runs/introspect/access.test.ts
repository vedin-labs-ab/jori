import { expect, test } from "vitest"
import { databaseContext, id } from "../../../test/convex/database"
import { type Doc } from "../../_generated/dataModel"
import { canInspectRun, canSee } from "./access"

test("allows organization runs and only matching private buckets", () => {
  const current = run({
    audience: "conversation",
    conversationId: id<"conversations">("conversation"),
    createdBy: id<"persons">("person"),
  })

  expect(canSee(current, run({ audience: "organization" }))).toBe(true)
  expect(
    canSee(
      current,
      run({
        audience: "conversation",
        conversationId: id<"conversations">("conversation"),
      })
    )
  ).toBe(true)
  expect(
    canSee(
      current,
      run({
        audience: "conversation",
        conversationId: id<"conversations">("other"),
      })
    )
  ).toBe(false)
  expect(
    canSee(
      current,
      run({
        audience: "person",
        createdBy: id<"persons">("person"),
      })
    )
  ).toBe(true)
  expect(canSee(current, run({ audience: "person" }))).toBe(false)
})

test("denies conversation runs without a conversation id", () => {
  const current = run({ audience: "conversation" })
  const candidate = run({ audience: "conversation" })

  expect(canSee(current, candidate)).toBe(false)
})

function run(overrides: Partial<Doc<"runs">>): Doc<"runs"> {
  return {
    _creationTime: 0,
    _id: id<"runs">("run"),
    principal: { kind: "organization" },
    audience: "person",
    cause: { type: "manual" },
    createdAt: 0,
    snapshot: { context: [], source: { type: "manual" }, title: "Run" },
    status: "running",
    organizationId: "organization",
    ...overrides,
  }
}

test("shared execution cannot inspect its sender's other private runs", async () => {
  const { ctx } = databaseContext()
  const personId = id<"persons">("sender")
  const current = run({ audience: "conversation", createdBy: personId })
  const candidate = run({ audience: "person", createdBy: personId })
  expect(await canInspectRun(ctx, current, candidate)).toBe(false)
})

test("chat inspection shares its own historical runs and checks other chats with execution identity", async () => {
  const { ctx, database } = databaseContext()
  const owner = id<"persons">("owner")
  const conversationId = await database.insert("conversations", {
    organizationId: "organization",
    surface: "console",
    externalId: "chat",
    scope: "conversation",
    visibility: { mode: "people", personIds: [owner] },
    createdBy: owner,
  })
  const current = run({
    audience: "conversation",
    conversationId,
    createdBy: owner,
  })
  const historical = run({
    audience: "person",
    conversationId,
    createdBy: owner,
  })
  expect(await canInspectRun(ctx, current, historical)).toBe(true)
  const otherId = await database.insert("conversations", {
    organizationId: "organization",
    surface: "console",
    externalId: "other",
    scope: "person",
    visibility: { mode: "private" },
    createdBy: owner,
  })
  expect(
    await canInspectRun(
      ctx,
      current,
      run({ conversationId: otherId, createdBy: owner })
    )
  ).toBe(false)
  await database.patch(otherId, { visibility: { mode: "organization" } })
  expect(
    await canInspectRun(
      ctx,
      current,
      run({ conversationId: otherId, createdBy: owner })
    )
  ).toBe(true)
})
