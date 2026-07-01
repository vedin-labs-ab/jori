import { expect, test } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { canSee } from "./access"

test("allows tenant runs and only matching private buckets", () => {
  const current = run({
    audienceScope: "conversation",
    conversationId: id<"conversations">("conversation"),
    createdBy: id<"persons">("person"),
  })

  expect(canSee(current, run({ audienceScope: "tenant" }))).toBe(true)
  expect(
    canSee(
      current,
      run({
        audienceScope: "conversation",
        conversationId: id<"conversations">("conversation"),
      })
    )
  ).toBe(true)
  expect(
    canSee(
      current,
      run({
        audienceScope: "conversation",
        conversationId: id<"conversations">("other"),
      })
    )
  ).toBe(false)
  expect(
    canSee(
      current,
      run({
        audienceScope: "person",
        createdBy: id<"persons">("person"),
      })
    )
  ).toBe(true)
  expect(canSee(current, run({ audienceScope: "person" }))).toBe(false)
})

test("denies conversation runs without a conversation id", () => {
  const current = run({ audienceScope: "conversation" })
  const candidate = run({ audienceScope: "conversation" })

  expect(canSee(current, candidate)).toBe(false)
})

function run(overrides: Partial<Doc<"runs">>): Doc<"runs"> {
  return {
    _creationTime: 0,
    _id: id<"runs">("run"),
    audienceScope: "person",
    cause: { type: "manual" },
    createdAt: 0,
    snapshot: { context: [], source: { type: "manual" }, title: "Run" },
    status: "running",
    tenantId: "tenant",
    ...overrides,
  }
}

function id<TableName extends "conversations" | "persons" | "runs">(
  value: string
) {
  return value as Id<TableName>
}
