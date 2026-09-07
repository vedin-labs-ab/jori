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
import { typeInto } from "../../../../../test/editor"
import { renewalsConversationId } from "../../fixtures/chat"
import { folderId } from "../../fixtures/folders"
import { demoId } from "../../fixtures/ids"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(cleanup)

/** The pane's name is the way to the target's page. */
function expectPaneLink(pane: HTMLElement, name: string, href: string) {
  expect(within(pane).getByRole("link", { name }).getAttribute("href")).toBe(
    href
  )
}

test("a reference card opens its table beside the chat, with the way to its page", async () => {
  render(<DemoConsoleAt path={`/chat/${renewalsConversationId}`} />)

  fireEvent.click(
    (await screen.findAllByRole("button", { name: /Customer renewals/ })).at(
      -1
    ) as HTMLElement
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

  typeInto(field, "Chase the unpaid renewals")
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

test("a folder, a run, and another chat each open beside the chat, with the way to their pages", async () => {
  // Opening by hand, so the reply's own resource does not take the pane.
  window.localStorage.setItem("jori.chat.pane", "manual")
  render(<DemoConsoleAt path="/chat" />)

  const field = await screen.findByRole("textbox", { name: "Message" })
  const finance = folderId("finance")
  const harbor = demoId("runs", "harbor")

  typeInto(
    field,
    `Look at +[folder:${finance}], +[run:${harbor}] and +[chat:${renewalsConversationId}]`
  )
  fireEvent.keyDown(field, { key: "Enter" })

  // The folder: its listing, with the subfolder and the table filed in it.
  fireEvent.click(await screen.findByRole("button", { name: "Finance" }))

  const pane = screen.getByRole("complementary", { name: "Resources" })

  expectPaneLink(pane, "Finance", `/folders/${finance}`)
  expectPaneLink(pane, "Renewals", `/folders/${folderId("renewals")}`)
  expect(within(pane).queryByRole("button", { name: "New" })).toBeNull()

  // The run: its row held open to the task and the outcome, with the
  // name leading to that row on the Activity page.
  fireEvent.click(
    screen.getByRole("button", {
      name: "Add Harbor House to the renewals table",
    })
  )

  expectPaneLink(
    pane,
    "Add Harbor House to the renewals table",
    `/runs?run=${harbor}`
  )
  expect(within(pane).getByText(/One row added, marked at risk/)).toBeDefined()
  expect(within(pane).queryByRole("button", { expanded: true })).toBeNull()

  // The other chat: its turns, and its table card opens in the same pane.
  fireEvent.click(
    screen.getByRole("button", {
      name: "Which renewals are at risk this month?",
    })
  )

  expectPaneLink(
    pane,
    "Which renewals are at risk this month?",
    `/chat/${renewalsConversationId}`
  )
  expect(
    within(pane).getByText("One of the four renewals is at risk.")
  ).toBeDefined()

  // The ask's chip and the reply's card both name the table; the card
  // comes last.
  fireEvent.click(
    within(pane)
      .getAllByRole("button", { name: /^Customer renewals/ })
      .at(-1) as HTMLElement
  )

  expect(
    (await screen.findByRole("tab", { name: "Customer renewals" })).dataset
      .state
  ).toBe("active")
  expect(within(pane).getByText("4 rows")).toBeDefined()
})
