import { describe, expect, test } from "vitest"
import {
  getJobScopeConflict,
  getJobSurfaceScopeIssue,
  isJobSurfaceAllowedForScope,
  jobScopeConflictMessage,
} from "./scope"

describe("job sharing scope", () => {
  test("allows every integration for personal jobs", () => {
    expect(isJobSurfaceAllowedForScope("personal", "gmail")).toBe(true)
    expect(isJobSurfaceAllowedForScope("personal", "github")).toBe(true)
  })

  test("allows organization integrations and rejects personal integrations", () => {
    expect(isJobSurfaceAllowedForScope("organization", "github")).toBe(true)
    expect(isJobSurfaceAllowedForScope("organization", "gmail")).toBe(false)
  })

  test("returns one normalized conflict for every incompatible surface", () => {
    expect(
      getJobScopeConflict("organization", [
        { integration: "gmail", tools: ["gmail_search"] },
        { integration: "gmail", tools: ["gmail_send"] },
        { integration: "github", tools: ["github_get_issue"] },
      ])
    ).toEqual({
      integrations: ["gmail"],
      message: jobScopeConflictMessage,
    })
    expect(getJobScopeConflict("personal", [])).toBeUndefined()
  })

  test("describes the affected integration at the reference edge", () => {
    expect(getJobSurfaceScopeIssue("organization", "gmail")).toBe(
      "Gmail requires Personal sharing."
    )
    expect(getJobSurfaceScopeIssue("organization", "github")).toBeUndefined()
  })
})
