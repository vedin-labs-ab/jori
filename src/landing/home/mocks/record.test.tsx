/* @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DemoWorkspaceProvider } from "../../demo/provider"
import { Record } from "./record"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

afterEach(cleanup)

function first<Item>(items: Item[]): Item {
  const [item] = items

  if (item === undefined) {
    throw new Error("Nothing matched.")
  }

  return item
}

test("opens the chase run on its record and stops a live run in place", async () => {
  render(
    <DemoWorkspaceProvider>
      <Record />
    </DemoWorkspaceProvider>
  )

  expect(await screen.findByText(/Three reminders sent/)).toBeDefined()
  expect(screen.getByText("Payroll sync test is flaky on CI")).toBeDefined()
  expect(screen.getAllByRole("button", { name: "Stop run" })).toHaveLength(2)

  fireEvent.click(first(screen.getAllByRole("button", { name: "Stop run" })))
  // The dialog is modal, so the only stop control left in the tree is its
  // confirmation.
  fireEvent.click(screen.getByRole("button", { name: /stop/i }))

  await waitFor(() => {
    expect(screen.getAllByRole("button", { name: "Stop run" })).toHaveLength(1)
  })
})
