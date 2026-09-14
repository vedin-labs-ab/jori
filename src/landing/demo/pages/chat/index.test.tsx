/* @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DemoConsoleAt } from "../../../../../test/demo"
import { typeInto } from "../../../../../test/editor"
import { advanceUntil } from "../../../../../test/timers"
import { renewalsConversationId } from "../../fixtures/chat"

// Load the real lazy views before the tests start. Cold module transforms
// must not race the query deadlines for chat and pane behavior.
import "./index"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

test("sends a message from the home, works a moment, then reads the reply", async () => {
  render(<DemoConsoleAt path="/chat" />)

  expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("New chat")
  expect(
    await screen.findByRole("link", {
      name: /Which renewals are at risk this month\?/,
    })
  ).toBeDefined()

  const field = screen.getByRole("textbox", { name: "Message" })

  typeInto(field, "Chase the unpaid renewals")
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  await act(async () => fireEvent.keyDown(field, { key: "Enter" }))

  // The console moves to the new conversation, named in the header, where
  // the ask stands and the run works under it with its log folded away.
  expect(screen.getByText("Working")).toBeDefined()
  expect(
    screen.getByRole("button", { name: "Chase the unpaid renewals" })
      .textContent
  ).toBe("Chase the unpaid renewals")
  expect(
    screen.getByText("Chase the unpaid renewals", { selector: "div" })
  ).toBeDefined()
  expect(screen.getByRole("button", { name: "Stop run" })).toBeDefined()

  // The thinking shows first, then the reply arrives, with the job it
  // names and its question.
  await advanceUntil(() => screen.queryByText("Thinking") !== null)
  expect(screen.getByText("Thinking")).toBeDefined()
  await advanceUntil(() => screen.queryByText("Working") === null)
  expect(screen.getByText(/Leave/)).toBeDefined()
  expect(screen.getByRole("button", { name: /^Renewals watch/ })).toBeDefined()
  expect(
    screen.getByText("Post a summary to #finance when it is done?")
  ).toBeDefined()
  expect(screen.queryByText("Working")).toBeNull()

  // The three questions are walked in order and answered as one message.
  expect(screen.getByRole("progressbar").textContent).toBe("Question 1 of 3")

  fireEvent.click(screen.getByRole("radio", { name: /^Keep it here/ }))
  fireEvent.click(screen.getByRole("button", { name: "Next" }))
  fireEvent.click(screen.getByRole("radio", { name: /^Every Monday/ }))
  fireEvent.click(screen.getByRole("button", { name: "Next" }))
  fireEvent.click(screen.getByRole("radio", { name: /^Me/ }))
  fireEvent.click(screen.getByRole("button", { name: "Answer" }))

  expect(screen.getAllByRole("listitem", { current: true })).toHaveLength(3)
})

test("files a chat from its title menu, shows its folder trail, and unfiles it from the folder", async () => {
  render(<DemoConsoleAt path={`/chat/${renewalsConversationId}`} />)
  const title = "Which renewals are at risk this month?"
  fireEvent.pointerDown(await screen.findByRole("button", { name: title }), {
    button: 0,
    ctrlKey: false,
  })
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Move to folder…" })
  )
  const dialog = await screen.findByRole("dialog")
  fireEvent.click(within(dialog).getByRole("button", { name: "Engineering" }))
  fireEvent.click(within(dialog).getByRole("button", { name: "Move" }))
  fireEvent.click(await screen.findByRole("link", { name: "Engineering" }))
  const row = (
    await screen.findByRole("link", { name: new RegExp(title) })
  ).closest("tr")
  expect(row?.textContent).toContain("Chat")
  expect(row?.textContent).toContain("Only me")
  fireEvent.pointerDown(
    screen.getByRole("button", { name: `Open actions for ${title}` }),
    {
      button: 0,
      ctrlKey: false,
    }
  )
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Remove from folder" })
  )
  expect(screen.queryByRole("link", { name: new RegExp(title) })).toBeNull()
})

test("stopping the run leaves a quiet notice under the ask", async () => {
  render(<DemoConsoleAt path="/chat" />)

  const field = await screen.findByRole("textbox", { name: "Message" })

  typeInto(field, "Chase the unpaid renewals")
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  await act(async () => fireEvent.keyDown(field, { key: "Enter" }))
  fireEvent.click(screen.getByRole("button", { name: "Stop run" }))

  expect(screen.getByText("Jori stopped before finishing")).toBeDefined()
  expect(screen.queryByText("Working")).toBeNull()
  expect(screen.getByRole("button", { name: "Send message" })).toBeDefined()
})

test("opens the seeded conversation with its table and next steps", async () => {
  render(<DemoConsoleAt path={`/chat/${renewalsConversationId}`} />)

  expect(
    await screen.findByRole("columnheader", { name: "Customer" })
  ).toBeDefined()
  expect(
    screen
      .getAllByRole("button", { name: /Customer renewals/ })
      .at(-1) as HTMLElement
  ).toBeDefined()
  expect(
    screen.getByRole("button", { name: "Remind Harbor House" })
  ).toBeDefined()
})

test("the sidebar leads with New chat and lists the conversations under Activity", async () => {
  render(<DemoConsoleAt path="/chat" sidebar />)

  const links = screen.getAllByRole("link").map((link) => link.textContent)

  expect(links.slice(0, 3)).toEqual([
    "New chat",
    "Activity",
    "Which renewals are at risk this month? · Only me",
  ])
  expect(
    screen.getByRole("link", { name: "New chat" }).getAttribute("data-active")
  ).toBe("true")

  // A sent message opens a conversation, which joins the list at once.
  const field = await screen.findByRole("textbox", { name: "Message" })

  typeInto(field, "Summarize last week")
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  await act(async () => fireEvent.keyDown(field, { key: "Enter" }))

  expect(screen.getByText("Working")).toBeDefined()
  // The header names the conversation too, as the current page; the
  // sidebar's row is the link that moves.
  expect(
    screen
      .getByRole("link", { name: /Summarize last week/, current: false })
      .getAttribute("data-active")
  ).toBe("true")
  expect(
    screen.getByRole("link", { name: "New chat" }).getAttribute("data-active")
  ).toBe("false")
})

test("sharing from the chat menu shows the selected audience and persists it", async () => {
  render(<DemoConsoleAt path={`/chat/${renewalsConversationId}`} />)
  const title = "Which renewals are at risk this month?"
  fireEvent.pointerDown(await screen.findByRole("button", { name: title }), {
    button: 0,
    ctrlKey: false,
  })
  fireEvent.click(await screen.findByRole("menuitem", { name: "Audience…" }))
  const dialog = await screen.findByRole("dialog")
  expect(within(dialog).getByText("Visible only to you.")).toBeDefined()
  fireEvent.click(within(dialog).getByRole("combobox"))
  fireEvent.click(
    await screen.findByRole("option", { name: "Everyone in the organization" })
  )
  expect(
    within(dialog).getByText("Visible to everyone in the organization.")
  ).toBeDefined()
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }))
  fireEvent.pointerDown(await screen.findByRole("button", { name: title }), {
    button: 0,
    ctrlKey: false,
  })
  fireEvent.click(await screen.findByRole("menuitem", { name: "Audience…" }))
  expect(
    within(await screen.findByRole("dialog")).getByRole("combobox").textContent
  ).toBe("Everyone in the organization")
})
