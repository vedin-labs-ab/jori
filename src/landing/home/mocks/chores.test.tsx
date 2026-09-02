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

  for (const name of [
    "Weekly release summary",
    "Ticket triage",
    "Chase overdue invoices",
  ]) {
    expect(screen.getByText(name)).toBeDefined()
  }

  // The paused job is listed too, with its status offering the way back.
  expect(
    screen.getByRole("button", { name: "Resume Design review digest" })
  ).toBeDefined()

  fireEvent.click(screen.getByRole("button", { name: "Pause Ticket triage" }))

  expect(
    screen.getByRole("button", { name: "Resume Ticket triage" })
  ).toBeDefined()
})
