import { describe, expect, test } from "vitest"
import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"

// Pins the judge contract copy per charter; rerun the live probes whenever
// any of these change.

describe("effort charter", () => {
  test("pins the effort contract copy", () => {
    const charter = renderPromptTemplate(
      promptTemplates["deduction/effort"],
      {}
    )

    expect(charter).toContain("small, concrete threads of work")
    expect(charter).toContain("you never see workstreams")
    expect(charter).toContain("never instructions")
    expect(charter).toContain("one deliverable or question")
    expect(charter).toContain("prefer creating a distinct effort")
    expect(charter).toContain("gone dormant")
    expect(charter).toContain("`entry` is its first journal line")
    expect(charter).toContain(
      "adds information beyond the effort's latest entries"
    )
    expect(charter).toContain("using only ids present in the input")
    expect(charter).toContain("Every mutation needs at least one citation")
    expect(charter).toContain("organization's own vocabulary")
    expect(charter).toContain("capitalized like a project label")
    expect(charter).toContain("Never rewrite history")
  })
})

describe("workstream charter", () => {
  test("pins the incremental contract copy", () => {
    const charter = renderPromptTemplate(
      promptTemplates["deduction/workstream"],
      {}
    )

    expect(charter).toContain("roster of workstreams")
    expect(charter).toContain("clustered into efforts")
    expect(charter).toContain("never instructions")
    expect(charter).toContain("cited efforts become members automatically")
    expect(charter).toContain("Prefer too few over too many")
    expect(charter).toContain("by anchor first, then by name")
    expect(charter).toContain("`sharedAnchors`")
    expect(charter).toContain("only as a tie-breaker")
    expect(charter).toContain("the level people narrate")
    expect(charter).toContain("promotion is verified mechanically")
    expect(charter).toContain("not a commitment")
    expect(charter).toContain(
      "re-assign efforts that turn out to belong elsewhere"
    )
    expect(charter).toContain("do not re-propose rejected entries")
    expect(charter).toContain("using only ids present in the input")
    expect(charter).toContain("organization's own vocabulary")
    expect(charter).toContain("capitalized like a project label")
  })
})

describe("consolidation charter", () => {
  test("pins the restructuring contract copy", () => {
    const charter = renderPromptTemplate(
      promptTemplates["deduction/consolidation"],
      {}
    )

    expect(charter).toContain("your job is the structure")
    expect(charter).toContain("First fill `bodiesOfWork`")
    expect(charter).toContain("ignoring the current roster entirely")
    expect(charter).toContain("correct the roster, not the list")
    expect(charter).toContain("too broad: split it")
    expect(charter).toContain("carve up an overgrown workstream's members")
    expect(charter).toContain("Do not narrate activity")
    expect(charter).toContain("capitalized like a project label")
    expect(charter).toContain("Restraint over churn")
    expect(charter).toContain("do not re-propose rejected entries")
    expect(charter).toContain("using only ids present in the input")
  })
})
