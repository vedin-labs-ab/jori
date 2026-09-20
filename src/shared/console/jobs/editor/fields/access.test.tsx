// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { AccessFields } from "./access"

afterEach(cleanup)

test("marks personal access invalid for organization sharing", () => {
  render(
    <AccessFields
      available={[]}
      named={new Set()}
      onSurfaceAdd={vi.fn()}
      onSurfaceChange={vi.fn()}
      onSurfaceRemove={vi.fn()}
      permissions={undefined}
      scope="organization"
      surfaces={[{ integration: "gmail", tools: ["gmail_search"] }]}
    />
  )

  expect(
    screen
      .getByRole("button", { name: /Gmail access:/ })
      .getAttribute("aria-invalid")
  ).toBe("true")
  expect(screen.getByTitle("Gmail requires Personal sharing.")).toBeDefined()
})
