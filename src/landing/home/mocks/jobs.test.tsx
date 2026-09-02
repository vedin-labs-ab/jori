/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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

  const name = await screen.findByLabelText("Name")

  expect((name as HTMLInputElement).value).toBe("Chase overdue invoices")
  expect(await screen.findByText("Visible to 6 people.")).toBeDefined()
  expect(screen.getByText(/Narrowed to Finance/)).toBeDefined()
  expect(screen.getAllByText("Chase overdue invoices")).toHaveLength(1)

  fireEvent.click(screen.getByRole("button", { name: "Create job" }))

  expect(await screen.findAllByText("Chase overdue invoices")).toHaveLength(2)
})
