// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { AutomationContextSection } from "./context"

test("progressively discloses the context supplied to automation runs", () => {
  render(<AutomationContextSection />)

  const trigger = screen.getByRole("button", { name: "Context" })

  expect(trigger.getAttribute("aria-expanded")).toBe("false")
  expect(screen.queryByText("Profile")).toBeNull()
  expect(
    screen.queryByText("Requester, organization, and run details")
  ).toBeNull()

  fireEvent.click(trigger)

  for (const layer of ["Requester", "Organization", "Run"]) {
    expect(screen.getByRole("heading", { name: layer })).toBeDefined()
  }
  expect(screen.getByText("Account identities")).toBeDefined()
  expect(screen.getByText("Run identifiers")).toBeDefined()
  expect(screen.getByText("Automation identifiers")).toBeDefined()
  expect(screen.getByText("Associated artifact")).toBeDefined()
  expect(screen.getByText("Context is resolved for each run.")).toBeDefined()
})
