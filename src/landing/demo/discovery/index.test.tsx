// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import "@/shared/console/discovery/palette"
import { DemoConsoleAt } from "../../../../test/demo"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))
afterEach(cleanup)

test("search previews fixture content and opens a result inside its demo", async () => {
  render(<DemoConsoleAt path="/folders" />)
  fireEvent.click(screen.getByRole("button", { name: "Search workspace" }))
  const input = await screen.findByRole("combobox")
  expect((input as HTMLInputElement).value).toBe("renewal")
  const results = screen.getByRole("group", { name: "Results" })
  expect(
    within(results).getByRole("option", { name: /Release notes/ })
  ).toBeTruthy()
  fireEvent.click(
    within(results).getByRole("option", { name: /^Customer renewals/ })
  )
  expect(screen.queryByRole("dialog")).toBeNull()
  expect(
    await screen.findByRole("button", { name: "Customer column details" })
  ).toBeTruthy()
})

test("search shortcuts stay in their demo and omit unavailable platform pages", async () => {
  render(<DemoConsoleAt path="/folders" />)
  fireEvent.keyDown(document.body, { key: "k", code: "KeyK", ctrlKey: true })
  expect(screen.queryByRole("dialog")).toBeNull()
  fireEvent.keyDown(screen.getByRole("button", { name: "Search workspace" }), {
    key: "k",
    code: "KeyK",
    ctrlKey: true,
  })
  const input = await screen.findByRole("combobox")
  fireEvent.change(input, { target: { value: "integrations" } })
  expect(screen.queryByRole("group", { name: "Pages" })).toBeNull()
  fireEvent.click(screen.getByRole("button", { name: /Shortcuts/ }))
  const guide = screen.getByRole("region", { name: "Page shortcuts" })
  expect(within(guide).queryByText("Integrations")).toBeNull()
  expect(within(guide).getByText("Files")).toBeTruthy()
  fireEvent.change(input, { target: { value: "files" } })
  fireEvent.keyDown(input, {
    key: "F",
    code: "KeyF",
    altKey: true,
    shiftKey: true,
  })
  expect(screen.queryByRole("dialog")).toBeNull()
  expect(await screen.findByRole("heading", { name: "Files" })).toBeTruthy()
})
