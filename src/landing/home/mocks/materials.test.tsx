/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { DemoWorkspaceProvider } from "../../demo/provider"
import { Materials } from "./materials"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

// jsdom has no layout, so the grid's scrollport would measure 0x0 and its
// virtualizer would mount no rows.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(600)
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function first<Item>(items: Item[]): Item {
  const [item] = items

  if (item === undefined) {
    throw new Error("Nothing matched.")
  }

  return item
}

test("shows the renewals under Tables and keeps a corrected cell", async () => {
  render(
    <DemoWorkspaceProvider>
      <Materials />
    </DemoWorkspaceProvider>
  )

  expect(await screen.findByText("Harbor House")).toBeDefined()
  expect(screen.getByText("Larkspur Hotels")).toBeDefined()
  expect(screen.getByRole("link", { name: "Tables" })).toBeDefined()

  fireEvent.click(
    first(screen.getAllByRole("button", { name: /Edit Customer$/ }))
  )

  const editor = screen.getByRole("textbox", { name: "Customer value" })

  fireEvent.change(editor, { target: { value: "Harbor House Ltd" } })
  fireEvent.keyDown(editor, { key: "Enter" })

  expect(await screen.findByText("Harbor House Ltd")).toBeDefined()
})
