import { expect, test } from "vitest"
import { createWorkspace } from "../state"
import { demoResults } from "./results"

test("job and file previews keep a compact, balanced window around the query", () => {
  const state = createWorkspace(0)
  const text = `${"Background details. ".repeat(20)}Read the latest changes merged by the team and turn them into a customer-facing changelog with links to each change and a short explanation of its impact. ${"More context. ".repeat(20)}`
  state.jobs[0].instructions = text
  const file = state.materials.find((item) => item.kind === "file")
  if (!file) {
    throw new Error("Demo file fixture is missing")
  }
  file.text = text
  const results = demoResults(state, "into").filter(
    (hit) => hit.resourceId === state.jobs[0].id || hit.resourceId === file.id
  )
  expect(results).toHaveLength(2)
  for (const hit of results) {
    expect(hit.snippet.length).toBeLessThanOrEqual(82)
    expect(hit.snippet).toContain("turn them into a customer-facing changelog")
    expect(hit.snippet).not.toContain("Background details")
    expect(hit.snippet).not.toContain("More context")
  }
})
