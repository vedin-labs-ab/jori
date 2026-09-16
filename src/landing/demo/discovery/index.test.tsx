// @vitest-environment jsdom
import {
  act,
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
  render(<DemoConsoleAt path="/folders" sidebar />)
  fireEvent.click(
    screen.getAllByRole("button", { name: "Search workspace" })[0]!
  )
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

test("unavailable demo pages explain their state and cannot navigate by click or shortcut", async () => {
  render(<DemoConsoleAt path="/folders" sidebar />)
  fireEvent.keyDown(document.body, { key: "k", code: "KeyK", ctrlKey: true })
  expect(screen.queryByRole("dialog")).toBeNull()
  fireEvent.keyDown(
    screen.getAllByRole("button", { name: "Search workspace" })[0]!,
    {
      key: "k",
      code: "KeyK",
      ctrlKey: true,
    }
  )
  const input = await screen.findByRole("combobox")
  fireEvent.change(input, { target: { value: "Int" } })
  const integration = within(
    screen.getByRole("group", { name: "Pages" })
  ).getByRole("option", { name: /Integrations/ })
  expect(integration.getAttribute("aria-disabled")).toBe("true")
  act(() => integration.focus())
  expect(await screen.findByRole("tooltip")).toHaveProperty(
    "textContent",
    "Available in the full console."
  )
  fireEvent.click(integration)
  expect(
    screen.queryByRole("dialog"),
    "disabled click keeps search open"
  ).toBeTruthy()
  fireEvent.keyDown(integration, { key: "Enter" })
  expect(
    screen.queryByRole("dialog"),
    "Enter skips disabled result"
  ).toBeTruthy()
  fireEvent.keyDown(input, {
    key: "I",
    code: "KeyI",
    altKey: true,
    shiftKey: true,
  })
  expect(screen.getByRole("dialog")).toBeTruthy()
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
