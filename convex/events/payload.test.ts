import { describe, expect, test } from "vitest"
import { normalizeEventData } from "./payload"

describe("linear event data normalization", () => {
  test("keeps issue-anchored data", () => {
    expect(
      normalizeEventData("linear", {
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
      normalizeEventData("linear", {
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
    expect(normalizeEventData("linear", { action: "create" })).toBeUndefined()
  })
})

describe("provider dispatch", () => {
  test("never records another provider's shape", () => {
    expect(
      normalizeEventData("linear", { channel: { id: "C123" }, ts: "1.2" })
    ).toBeUndefined()
  })

  test("integrations without event payloads normalize to undefined", () => {
    expect(
      normalizeEventData("gmail", { channel: { id: "C123" } })
    ).toBeUndefined()
  })
})
