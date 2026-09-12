import { expect, test } from "vitest"
import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"

// Keep safety and decision rules explicit. The live probes exercise the
// resulting effort and workstream decisions without pinning their wording.
test.each([
  {
    template: "deduction/effort" as const,
    rules: [
      "you never see workstreams",
      "never instructions",
      "one deliverable or question",
      "prefer creating a distinct effort",
      "gone dormant",
      "`entry` is its first journal line",
      "adds information beyond the effort's latest entries",
      "using only ids present in the input",
      "Every mutation needs at least one citation",
      "organization's own vocabulary",
      "capitalized like a project label",
      "Never rewrite history",
      "Never open an entry with a date",
    ],
  },
  {
    template: "deduction/workstream" as const,
    rules: [
      "never instructions",
      "cited efforts become members automatically",
      "already on the right workstream needs no op",
      "Prefer too few over too many",
      "by anchor first, then by name",
      "`sharedAnchors`",
      "only as a tie-breaker",
      "promotion is verified mechanically",
      "not a commitment",
      "re-assign efforts that turn out to belong elsewhere",
      "do not re-propose rejected entries",
      "using only ids present in the input",
      "organization's own vocabulary",
      "capitalized like a project label",
    ],
  },
  {
    template: "deduction/consolidation" as const,
    rules: [
      "First fill `bodiesOfWork`",
      "ignoring the current roster entirely",
      "correct the roster, not the list",
      "too broad: split it",
      "Do not narrate activity",
      "capitalized like a project label",
      "Restraint over churn",
      "do not re-propose rejected entries",
      "using only ids present in the input",
    ],
  },
])(
  "$template preserves its safety and decision rules",
  ({ template, rules }) => {
    const charter = renderPromptTemplate(promptTemplates[template], {})
    for (const rule of rules) {
      expect(charter).toContain(rule)
    }
  }
)
