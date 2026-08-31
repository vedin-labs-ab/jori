import { expect, test } from "vitest"
import { id } from "../../../test/convex/database"
import { type Doc } from "../../_generated/dataModel"
import { canSee } from "./access"

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
