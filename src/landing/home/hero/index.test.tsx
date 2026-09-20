/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { DemoWorkspaceProvider } from "../../demo/provider"
import { Hero } from "."

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

// jsdom has no layout, so the grid's scrollport would measure 0x0 and its
// virtualizer would mount no rows once the chip opens the table.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(600)
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderHero() {
  render(
    <DemoWorkspaceProvider>
      <Hero />
    </DemoWorkspaceProvider>
  )
}

test("opens the console on the folder the thread files into", () => {
  renderHero()

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
    "The shared drive your AI works out of."
  )
  expect(
    screen.getAllByRole("link", { name: /Customer renewals/ }).length
  ).toBeGreaterThan(0)
  expect(
    screen.getByRole("heading", { level: 2, name: "Renewals" })
  ).toBeDefined()
  expect(screen.getByText("Chase overdue invoices")).toBeDefined()
  expect(
    screen.getByText("will keep it current.", { exact: false })
  ).toBeDefined()
})

test("the reply's job chip opens the job's page", async () => {
  renderHero()

  fireEvent.click(screen.getByRole("button", { name: "Renewals watch" }))

  expect(await screen.findByText("Instructions")).toBeDefined()
  expect(screen.getByRole("heading", { name: "Runs" })).toBeDefined()
})

test("the reply's chip opens the table it filed into", async () => {
  renderHero()

  fireEvent.click(screen.getByRole("button", { name: /^Customer renewals/ }))

  expect(await screen.findByText("Renews")).toBeDefined()
})
