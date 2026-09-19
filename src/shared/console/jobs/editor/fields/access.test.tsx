// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type JobPolicyPermissions } from "../../access/policy"
import { AccessFields } from "./access"
import { JobToolRisk } from "./risk"

afterEach(cleanup)

test("marks personal additional access invalid for organization sharing", () => {
  render(
    <AccessFields
      additionalSurfaces={[{ integration: "gmail", tools: ["gmail_search"] }]}
      onAdditionalSurfaceChange={vi.fn()}
      onAdditionalSurfaceRemove={vi.fn()}
      permissions={undefined}
      scope="organization"
    />
  )

  expect(
    screen
      .getByRole("button", { name: /Gmail additional access/ })
      .getAttribute("aria-invalid")
  ).toBe("true")
  expect(screen.getByTitle("Gmail requires Personal sharing.")).toBeDefined()
})

test.each(["blocked", "prompted"] as const)(
  "does not count a %s tool as available to an unattended job",
  (mode) => {
    render(
      <JobToolRisk
        surfaces={[{ integration: "jori", tools: ["read_table", "web_fetch"] }]}
        permissions={
          [
            { tool: "read_table", mode: "allowed" },
            { tool: "web_fetch", mode },
          ] as JobPolicyPermissions
        }
      />
    )
    expect(screen.queryByRole("status")).toBeNull()
  }
)
