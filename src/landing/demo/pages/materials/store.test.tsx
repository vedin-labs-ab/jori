/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DemoConsoleAt } from "../../../../../test/demo"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

afterEach(cleanup)

test("opens a store's form and keeps a value edited in memory", async () => {
  render(<DemoConsoleAt path="/stores/collections_release" />)

  const version = (await screen.findByLabelText("version")) as HTMLInputElement

  expect(version.value).toBe("2.14")
  expect(screen.getByText("v37")).toBeDefined()
  expect(screen.getByRole("link", { name: "Engineering" })).toBeDefined()

  fireEvent.change(screen.getByLabelText("rolloutPercent"), {
    target: { value: "50" },
  })

  // The autosave lands after its debounce and bumps the version.
  expect(await screen.findByText("v38")).toBeDefined()
  expect(
    (screen.getByLabelText("rolloutPercent") as HTMLInputElement).value
  ).toBe("50")
})
