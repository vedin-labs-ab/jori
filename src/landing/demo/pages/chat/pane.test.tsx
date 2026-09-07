/* @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { DemoConsoleAt } from "../../../../../test/demo"
import { renewalsConversationId } from "../../fixtures/chat"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(cleanup)

test("a reference card opens its table beside the chat, with the way to its page", async () => {
  render(<DemoConsoleAt path={`/chat/${renewalsConversationId}`} />)

  fireEvent.click(
    await screen.findByRole("button", { name: /Customer renewals/ })
  )

  const tab = await screen.findByRole("tab", { name: "Customer renewals" })
  const pane = screen.getByRole("complementary", { name: "Resources" })

  expect(tab.dataset.state).toBe("active")
  expect(
    within(pane).getByRole("button", { name: "Customer column details" })
  ).toBeDefined()
  expect(within(pane).getByText("4 rows")).toBeDefined()
  expect(
    within(pane)
      .getByRole("link", { name: "Customer renewals" })
      .getAttribute("href")
  ).toBe("/tables/collections_renewals")
  // The thread's own rendering of the table stays where it was.
  expect(
    screen.getAllByRole("columnheader", { name: "Customer" })
  ).toHaveLength(1)

  fireEvent.click(within(pane).getByRole("button", { name: "Close pane" }))

  expect(screen.queryByRole("complementary", { name: "Resources" })).toBeNull()
})

test("a reply opens the job it names, and the hint asks once how to go on", async () => {
  render(<DemoConsoleAt path="/chat" />)

  const field = await screen.findByRole("textbox", { name: "Message" })

  fireEvent.change(field, { target: { value: "Chase the unpaid renewals" } })
  fireEvent.keyDown(field, { key: "Enter" })

  const tab = await screen.findByRole(
    "tab",
    { name: "Renewals watch" },
    { timeout: 8000 }
  )
  const pane = screen.getByRole("complementary", { name: "Resources" })

  expect(tab.dataset.state).toBe("active")
  expect(await within(pane).findByText("Instructions")).toBeDefined()

  // The hint floats over the chat, not in the pane.
  const hint = screen.getByRole("toolbar", {
    name: "Resources beside the chat",
  })

  expect(hint.textContent).toContain("New resources open beside your chat.")
  expect(within(pane).queryByText(/New resources/)).toBeNull()

  fireEvent.click(within(hint).getByRole("button", { name: "Open manually" }))

  expect(window.localStorage.getItem("jori.chat.pane")).toBe("manual")
  expect(
    screen.queryByRole("toolbar", { name: "Resources beside the chat" })
  ).toBeNull()
})
