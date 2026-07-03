import { describe, expect, test } from "vitest"
import { normalizeEventData } from "./payload"

describe("linear event data normalization", () => {
  test("keeps issue-anchored data", () => {
    expect(
      normalizeEventData({
        action: "update",
        issueId: "issue-1",
        issueIdentifier: "ENG-42",
        projectId: "project-1",
      })
    ).toEqual({
      action: "update",
      issueId: "issue-1",
      issueIdentifier: "ENG-42",
      projectId: "project-1",
    })
  })

  test("keeps project-anchored data without an issue id", () => {
    expect(
      normalizeEventData({
        action: "create",
        projectId: "project-1",
        project: { id: "project-1", name: "Payments revamp", url: "https://x" },
      })
    ).toEqual({
      action: "create",
      projectId: "project-1",
      project: { id: "project-1", name: "Payments revamp", url: "https://x" },
    })
  })

  test("drops data with neither anchor", () => {
    expect(normalizeEventData({ action: "create" })).toBeUndefined()
  })
})
