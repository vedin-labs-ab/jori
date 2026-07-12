import { describe, expect, test } from "vitest"
import {
  automationScopeConflictMessage,
  getAutomationScopeConflict,
  getAutomationSurfaceScopeIssue,
  isAutomationSurfaceAllowedForScope,
} from "./scope"

describe("automation sharing scope", () => {
  test("allows every integration for personal automations", () => {
    expect(isAutomationSurfaceAllowedForScope("personal", "gmail")).toBe(true)
    expect(isAutomationSurfaceAllowedForScope("personal", "github")).toBe(true)
  })

  test("allows organization integrations and rejects personal integrations", () => {
    expect(isAutomationSurfaceAllowedForScope("organization", "github")).toBe(
      true
    )
    expect(isAutomationSurfaceAllowedForScope("organization", "gmail")).toBe(
      false
    )
  })

  test("returns one normalized conflict for every incompatible surface", () => {
    expect(
      getAutomationScopeConflict("organization", [
        { integration: "gmail", tools: ["gmail_search"] },
        { integration: "gmail", tools: ["gmail_send"] },
        { integration: "github", tools: ["github_get_issue"] },
      ])
    ).toEqual({
      integrations: ["gmail"],
      message: automationScopeConflictMessage,
    })
    expect(getAutomationScopeConflict("personal", [])).toBeUndefined()
  })

  test("describes the affected integration at the reference edge", () => {
    expect(getAutomationSurfaceScopeIssue("organization", "gmail")).toBe(
      "Gmail requires Personal sharing."
    )
    expect(
      getAutomationSurfaceScopeIssue("organization", "github")
    ).toBeUndefined()
  })
})
