/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DemoWorkspaceProvider } from "../../demo/provider"
import { Chores } from "./chores"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

afterEach(cleanup)

test("lists the jobs and pauses one from its row", () => {
  render(
    <DemoWorkspaceProvider>
      <Chores />
    </DemoWorkspaceProvider>
  )

  expect(screen.queryByRole("heading", { level: 1 })).toBeNull()
  expect(screen.getByRole("heading", { name: "Jobs", level: 3 })).toBeDefined()

  for (const name of [
    "Weekly release summary",
    "Ticket triage",
    "Chase overdue invoices",
  ]) {
    const href = screen.getByRole("link", { name }).getAttribute("href")
    expect(href?.startsWith("#")).toBe(true)
    expect(document.getElementById(href?.slice(1) ?? "")).not.toBeNull()
  }

  // The paused job is listed too, wearing its badge beside the filter
  // panel's own Paused option.
  expect(screen.getAllByText("Paused")).toHaveLength(2)

  openActions("Ticket triage")
  fireEvent.click(screen.getByRole("menuitem", { name: "Pause" }))
  openActions("Ticket triage")

  expect(screen.getByRole("menuitem", { name: "Resume" })).toBeDefined()
  expect(screen.getAllByText("Paused")).toHaveLength(3)
})

test("a row's name opens the job's page inside the same console", async () => {
  render(
    <DemoWorkspaceProvider>
      <Chores />
    </DemoWorkspaceProvider>
  )

  fireEvent.click(screen.getByRole("link", { name: "Chase overdue invoices" }))

  expect(await screen.findByText("Instructions")).toBeDefined()
  // The crumb leads back to Jobs; the Folder row to where it is filed.
  expect(screen.getByRole("link", { name: "Jobs" })).toBeDefined()
  expect(screen.getAllByRole("link", { name: "Renewals" })).toHaveLength(1)
})

function openActions(name: string) {
  fireEvent.pointerDown(
    screen.getByRole("button", { name: `Open actions for ${name}` }),
    { button: 0, ctrlKey: false }
  )
}
