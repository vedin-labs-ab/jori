// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { AutomationContextSection } from "./context"

afterEach(cleanup)

test("progressively discloses the context supplied to automation runs", () => {
  render(<AutomationContextSection scope="personal" />)

  const trigger = screen.getByRole("button", { name: "Context" })

  expect(trigger.className).toContain("hover:bg-muted")
  expect(trigger.className).toContain("hover:px-2")
  expect(trigger.className).toContain("min-h-7")
  expect(trigger.className).toContain("px-0")
  expect(trigger.className).toContain("py-1.5")
  expect(trigger.getAttribute("aria-expanded")).toBe("false")
  expect(screen.queryByText("Profile")).toBeNull()
  expect(
    screen.queryByText("Requester, organization, and run details")
  ).toBeNull()

  fireEvent.click(trigger)

  for (const layer of ["Requester", "Organization", "Run"]) {
    expect(screen.getByRole("heading", { name: layer })).toBeDefined()
  }
  expect(
    screen.getByRole("heading", { name: "Requester" }).parentElement
      ?.parentElement?.className
  ).toContain("sm:grid-cols-3")
  expect(screen.getByText("Account identities")).toBeDefined()
  expect(screen.getByText("Run identifiers")).toBeDefined()
  expect(screen.getByText("Automation identifiers")).toBeDefined()
  expect(screen.getByText("Context is resolved for each run.")).toBeDefined()
})

test("omits requester context for organization automations", () => {
  render(<AutomationContextSection scope="organization" />)

  fireEvent.click(screen.getByRole("button", { name: "Context" }))

  expect(screen.queryByRole("heading", { name: "Requester" })).toBeNull()
  expect(screen.getByRole("heading", { name: "Organization" })).toBeDefined()
  expect(screen.getByRole("heading", { name: "Run" })).toBeDefined()
  expect(
    screen.getByRole("heading", { name: "Organization" }).parentElement
      ?.parentElement?.className
  ).toContain("sm:grid-cols-2")
})
