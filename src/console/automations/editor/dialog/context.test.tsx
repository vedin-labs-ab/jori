// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { AutomationContextSection } from "./context"

test("progressively discloses the context supplied to automation runs", () => {
  render(<AutomationContextSection />)

  const trigger = screen.getByRole("button", { name: "Context" })

  expect(trigger.getAttribute("aria-expanded")).toBe("false")
  expect(screen.queryByText("Approved profile")).toBeNull()

  fireEvent.click(trigger)

  for (const layer of ["Requester", "Organization", "Run"]) {
    expect(screen.getByRole("heading", { name: layer })).toBeDefined()
  }
  expect(screen.getByText("Accessible account identities")).toBeDefined()
  expect(screen.getByText("Run and automation IDs")).toBeDefined()
  expect(
    screen.getByText("Available context is resolved fresh for every run.")
  ).toBeDefined()
})
