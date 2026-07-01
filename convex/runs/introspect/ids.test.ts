import { expect, test } from "vitest"
import { type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { normalizeRunId, normalizeRunIds } from "./ids"

test("normalizes optional run id strings", () => {
  const ctx = contextWithRunIds(["run_valid"])

  expect(normalizeRunId(ctx, undefined)).toBeUndefined()
  expect(normalizeRunId(ctx, "")).toBeUndefined()
  expect(normalizeRunId(ctx, "  ")).toBeUndefined()
  expect(normalizeRunId(ctx, " run_valid ")).toBe(id("run_valid"))
  expect(normalizeRunId(ctx, "message_id")).toBeNull()
})

test("normalizes run id arrays while preserving explicit invalid input", () => {
  const ctx = contextWithRunIds(["run_one", "run_two"])

  expect(normalizeRunIds(ctx, undefined)).toBeUndefined()
  expect(normalizeRunIds(ctx, [])).toBeUndefined()
  expect(normalizeRunIds(ctx, ["", "  "])).toBeUndefined()
  expect(normalizeRunIds(ctx, ["run_one", "missing", " run_two "])).toEqual([
    id("run_one"),
    id("run_two"),
  ])
  expect(normalizeRunIds(ctx, ["missing"])).toEqual([])
})

function contextWithRunIds(values: string[]) {
  const valid = new Set(values)

  return {
    db: {
      normalizeId: (_tableName: "runs", value: string) =>
        valid.has(value) ? id(value) : null,
    },
  } as unknown as Pick<QueryCtx, "db">
}

function id(value: string) {
  return value as Id<"runs">
}
