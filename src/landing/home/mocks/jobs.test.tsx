/* @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DemoWorkspaceProvider } from "../../demo/provider"
import { Chores } from "./chores"
import { Jobs } from "./jobs"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

afterEach(cleanup)

test("seeds the editor with the chase brief and files a job from it", async () => {
  // The Jobs list above the editor is where a created job shows up.
  render(
    <DemoWorkspaceProvider>
      <Chores />
      <Jobs />
    </DemoWorkspaceProvider>
  )

  // Settle the lazy editor import before the form's interaction checks.
  await act(() => vi.dynamicImportSettled())

  const name = await screen.findByLabelText("Name")

  expect((name as HTMLInputElement).value).toBe("Chase overdue invoices")
  fireEvent.click(
    await screen.findByRole("button", { name: "Advanced settings" })
  )
  expect(await screen.findByRole("button", { name: "6 people" })).toBeDefined()
  expect(screen.getByText(/Narrowed to/).textContent).toContain("Finance")
  expect(screen.getAllByText("Chase overdue invoices")).toHaveLength(1)

  fireEvent.click(screen.getByRole("button", { name: "Create job" }))

  await waitFor(() =>
    expect(screen.getAllByText("Chase overdue invoices")).toHaveLength(2)
  )
})
