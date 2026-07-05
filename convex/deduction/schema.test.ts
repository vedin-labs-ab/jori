import { describe, expect, expectTypeOf, test } from "vitest"
import {
  type BeliefKind,
  beliefKinds,
  type PassStage,
  passStages,
} from "./schema"

describe("deduction schema", () => {
  test("beliefKinds array matches the beliefKind validator", () => {
    expectTypeOf<(typeof beliefKinds)[number]>().toEqualTypeOf<BeliefKind>()
    expect(beliefKinds).toEqual(["workstream"])
  })

  test("stages are the effort layer plus one per belief kind", () => {
    expectTypeOf<(typeof passStages)[number]>().toEqualTypeOf<PassStage>()
    expect(passStages).toEqual(["effort", ...beliefKinds])
  })
})
