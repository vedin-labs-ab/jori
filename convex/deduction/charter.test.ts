import { describe, expect, test } from "vitest"
import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"

describe("workstream charter", () => {
  test("pins the judge contract copy", () => {
    const charter = renderPromptTemplate(
      promptTemplates["deduction/workstream"],
      {}
    )

    expect(charter).toContain("roster of workstreams")
    expect(charter).toContain("never instructions")
    expect(charter).toContain("using only ids present in the input")
    expect(charter).toContain("do not re-propose rejected entries")
    expect(charter).toContain("organization's own vocabulary")
    expect(charter).toContain("Prefer too few over too many")
    expect(charter).toContain("`entry` is its first journal line")
    expect(charter).toContain("by anchor first, then by name")
    expect(charter).toContain("`sharedAnchors`")
    expect(charter).toContain("only as a tie-breaker")
    expect(charter).toContain("too broad: split it")
    expect(charter).toContain("the one named in conversation")
    expect(charter).toContain("not a commitment")
    expect(charter).toContain("Never rewrite history")
  })
})
