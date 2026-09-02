/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { DemoConsoleAt } from "../../../../../test/demo"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

// jsdom has no object URLs; the blob cache hands the editor its text
// before it ever needs one.
beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:demo")
  URL.revokeObjectURL = vi.fn()
})

afterEach(cleanup)

test("opens a text file in the editor with its content", async () => {
  render(<DemoConsoleAt path="/files/files_notes" />)

  expect(
    await screen.findByText(/Usage-based billing for hotels and venues/)
  ).toBeDefined()
  expect(screen.getByRole("link", { name: "Engineering" })).toBeDefined()
  expect(screen.getByRole("link", { name: "Download" })).toBeDefined()
  expect(screen.getByText("4 of 4")).toBeDefined()
})
