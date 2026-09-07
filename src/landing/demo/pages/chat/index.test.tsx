/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { DemoConsoleAt } from "../../../../../test/demo"
import { renewalsConversationId } from "../../fixtures/chat"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

afterEach(cleanup)

test("sends a message from the home, works a moment, then reads the reply", async () => {
  render(<DemoConsoleAt path="/chat" />)

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("New chat")
  expect(
    await screen.findByRole("link", {
      name: /Which renewals are at risk this month\?/,
    })
  ).toBeDefined()

  const field = screen.getByRole("textbox", { name: "Message" })

  fireEvent.change(field, { target: { value: "Chase the unpaid renewals" } })
  fireEvent.keyDown(field, { key: "Enter" })

  // The console moves to the new conversation, named in the header, where
  // the ask stands and the run works under it with its log folded away.
  expect(await screen.findByText("Working")).toBeDefined()
  expect(screen.getByRole("link", { current: "page" }).textContent).toBe(
    "Chase the unpaid renewals"
  )
  expect(
    screen.getByText("Chase the unpaid renewals", { selector: "div" })
  ).toBeDefined()
  expect(screen.getByRole("button", { name: "Stop" })).toBeDefined()

  // The thinking shows first, then the reply arrives, with the job it
  // names and its question.
  expect(await screen.findByText("Thinking")).toBeDefined()
  expect(await screen.findByText(/Leave/, {}, { timeout: 8000 })).toBeDefined()
  expect(
    await screen.findByRole("button", { name: /^Renewals watch/ })
  ).toBeDefined()
  expect(
    screen.getByText("Post a summary to #finance when it is done?")
  ).toBeDefined()
  expect(screen.queryByText("Working")).toBeNull()

  // The questions are walked in order and answered together: one message
  // with a line per question, and the questions lock.
  expect(screen.getByRole("progressbar").textContent).toBe("Question 1 of 3")

  fireEvent.click(screen.getByRole("radio", { name: /^Keep it here/ }))
  fireEvent.click(screen.getByRole("button", { name: "Next" }))
  fireEvent.click(screen.getByRole("radio", { name: /^Every Monday/ }))
  fireEvent.click(screen.getByRole("button", { name: "Next" }))
  fireEvent.click(screen.getByRole("radio", { name: /^Me/ }))
  fireEvent.click(screen.getByRole("button", { name: "Answer" }))

  // The answers are marked on the questions themselves; the message that
  // carried them is not repeated as a turn.
  expect(
    await screen.findAllByRole("listitem", { current: true })
  ).toHaveLength(3)
  expect(screen.queryByRole("radio")).toBeNull()
  expect(
    screen.queryByText(
      /Post a summary to #finance when it is done\? Keep it here/
    )
  ).toBeNull()
})

test("stopping the run leaves a quiet notice under the ask", async () => {
  render(<DemoConsoleAt path="/chat" />)

  const field = await screen.findByRole("textbox", { name: "Message" })

  fireEvent.change(field, { target: { value: "Chase the unpaid renewals" } })
  fireEvent.keyDown(field, { key: "Enter" })
  fireEvent.click(await screen.findByRole("button", { name: "Stop" }))

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
    screen.getByRole("button", { name: /Customer renewals/ })
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
    "Which renewals are at risk this month?",
  ])
  expect(
    screen.getByRole("link", { name: "New chat" }).getAttribute("data-active")
  ).toBe("true")

  // A sent message opens a conversation, which joins the list at once.
  const field = await screen.findByRole("textbox", { name: "Message" })

  fireEvent.change(field, { target: { value: "Summarize last week" } })
  fireEvent.keyDown(field, { key: "Enter" })

  expect(await screen.findByText("Working")).toBeDefined()
  // The header names the conversation too, as the current page; the
  // sidebar's row is the link that moves.
  expect(
    screen
      .getByRole("link", { name: "Summarize last week", current: false })
      .getAttribute("data-active")
  ).toBe("true")
  expect(
    screen.getByRole("link", { name: "New chat" }).getAttribute("data-active")
  ).toBe("false")
})
