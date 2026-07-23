import { describe, expect, expectTypeOf, test } from "vitest"
import { type BeliefKind, beliefKinds } from "./schema"

describe("deduction schema", () => {
  test("beliefKinds array matches the beliefKind validator", () => {
    expectTypeOf<(typeof beliefKinds)[number]>().toEqualTypeOf<BeliefKind>()
    expect(beliefKinds).toEqual(["workstream"])
  })
})
