// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { AccessFields } from "./access"

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
