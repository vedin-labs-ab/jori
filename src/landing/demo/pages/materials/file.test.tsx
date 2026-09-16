/* @vitest-environment jsdom */

import { readFileSync } from "node:fs"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { DemoConsoleAt } from "../../../../../test/demo"

// Load real lazy views before interaction assertions start their deadlines.
import "./file"
import "@/shared/console/mirror/view"

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
  expect(screen.getByRole("link", { name: "Files" })).toBeDefined()
  expect(screen.getByRole("link", { name: "Download" })).toBeDefined()
  expect(screen.getByText("4 of 4")).toBeDefined()
})

test("opens the forecast workbook as a sheet", async () => {
  // The fixture is a static asset; here the bytes come straight from disk.
  const bytes = readFileSync("public/demo/q3-forecast.xlsx")

  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(new Uint8Array(bytes))))
  )

  try {
    render(<DemoConsoleAt path="/files/files_forecast" />)

    const table = await screen.findByRole("table", { name: "Q3 forecast.xlsx" })

    expect(table.textContent).toContain("Net MRR")
    expect(table.textContent).toContain("September")
    expect(screen.getByRole("link", { name: "Download" })).toBeDefined()
  } finally {
    vi.unstubAllGlobals()
  }
})
