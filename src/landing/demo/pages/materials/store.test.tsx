/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DemoConsoleAt } from "../../../../../test/demo"

// Load real lazy views before interaction assertions start their deadlines.
import "./store"
import "@/shared/console/mirror/view"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

afterEach(cleanup)

test("opens a store's form and keeps a value edited in memory", async () => {
  render(<DemoConsoleAt path="/stores/collections_release" />)

  const version = (await screen.findByLabelText("version")) as HTMLInputElement

  expect(version.value).toBe("2.14")
  expect(screen.getByRole("link", { name: "Stores" })).toBeDefined()

  // Provenance moved off the page into the menu on the store's name.
  const title = screen.getByRole("button", { name: "Release state" })

  fireEvent.pointerDown(title)
  fireEvent.click(title)
  expect(await screen.findByText(/· v37$/)).toBeDefined()
  fireEvent.keyDown(document.activeElement ?? title, { key: "Escape" })

  fireEvent.change(screen.getByLabelText("rolloutPercent"), {
    target: { value: "50" },
  })

  // The autosave lands after its debounce and bumps the version.
  fireEvent.pointerDown(title)
  fireEvent.click(title)
  expect(await screen.findByText(/· v38$/)).toBeDefined()
  expect(
    (screen.getByLabelText("rolloutPercent") as HTMLInputElement).value
  ).toBe("50")
})
