import { describe, expect, test } from "vitest"
import {
  getToolPermissionsByProvider,
  resolveToolModes,
} from "../permissions/catalog"
import { canUseAutomationProviderAccess } from "./access"

describe("automation access policy", () => {
  test("treats prompted tools as unavailable for automation access", () => {
    const toolModes = resolveToolModes(
      getToolPermissionsByProvider("notion")
        .filter((permission) => permission.access === "read")
        .map((permission) => ({
          mode: "prompted" as const,
          tool: permission.tool,
        }))
    )

    expect(canUseAutomationProviderAccess(toolModes, "notion", "read")).toBe(
      false
    )
  })

  test("keeps required tools available for automation access", () => {
    const toolModes = resolveToolModes([
      { mode: "blocked", tool: "github_add_issue_comment" },
    ])

    expect(canUseAutomationProviderAccess(toolModes, "github", "write")).toBe(
      true
    )
  })
})
