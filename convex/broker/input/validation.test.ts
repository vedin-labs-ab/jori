import { expect, test } from "vitest"
import { normalizeBrokerToolInput } from "."
import { validateSchemaValue } from "./validation"

test("accepts valid issue and comment discriminator values", () => {
  for (const target of [
    { type: "issue", id: "issue-id" },
    { type: "comment", id: "comment-id", issueId: "issue-id" },
  ]) {
    expect(
      normalizeBrokerToolInput("linear_add_comment", {
        body: "Synthetic validation test",
        target,
      })
    ).toEqual({ body: "Synthetic validation test", target })
  }
  expect(() =>
    validateSchemaValue(1, { type: "integer", minimum: 1 }, "input")
  ).not.toThrow()
})

test.each(["other", "comment", 42, null])(
  "rejects a Linear comment target with mismatched discriminator %j",
  (type) => {
    expect(() =>
      normalizeBrokerToolInput("linear_add_comment", {
        body: "Synthetic validation test",
        target: { type, id: "issue-id" },
      })
    ).toThrow()
  }
)

test("oneOf rejects values matching multiple branches", () => {
  expect(() =>
    validateSchemaValue(
      5,
      { oneOf: [{ type: "number" }, { type: "number", minimum: 0 }] },
      "input"
    )
  ).toThrow()
})

test("oneOf still enforces sibling constraints", () => {
  expect(() =>
    validateSchemaValue(
      5,
      { maximum: 3, type: "number", oneOf: [{ type: "number" }] },
      "input"
    )
  ).toThrow()
})

test.each([1.5, "1", null, Number.NaN, Number.POSITIVE_INFINITY])(
  "integer schemas reject %j",
  (value) => {
    expect(() =>
      validateSchemaValue(value, { type: "integer", minimum: 1 }, "input")
    ).toThrow()
  }
)
