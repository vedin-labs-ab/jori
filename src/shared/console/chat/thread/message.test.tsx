// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ask, message, now, reply } from "../../../../../test/chat"
import { absoluteTime } from "../../time"
import { JoriMessage, MessageActions, PersonMessage } from "./message"

afterEach(cleanup)

/** The reply, sent since the clock last ticked. */
const justSent = message({ ...reply, createdAt: now - 30_000 })

function renderMessages() {
  const writeText = vi.fn(() => Promise.resolve())

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  })
  render(
    <TooltipProvider>
      <PersonMessage message={ask} now={now} />
      <JoriMessage>
        <p>The reply</p>
        <MessageActions message={justSent} now={now} />
      </JoriMessage>
    </TooltipProvider>
  )

  return writeText
}

test("each message has its actions under it, none hidden from assistive technology", () => {
  renderMessages()

  const rows = screen
    .getAllByRole("button", { name: "Copy message" })
    .map((copy) => copy.parentElement)

  expect(rows).toHaveLength(2)

  for (const row of rows) {
    expect(row?.querySelector("time")).not.toBeNull()
    expect(row?.querySelector("[aria-hidden='true'] button")).toBeNull()
  }
})

test("copying takes the message's text as written, and says so", async () => {
  const writeText = renderMessages()
  const [, copyReply] = screen.getAllByRole("button", { name: "Copy message" })

  // Jori's parts are cards; the copy is the markdown alone.
  fireEvent.click(copyReply as HTMLElement)

  await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(reply.text))
  expect(
    await screen.findByRole("button", { name: "Copied message" })
  ).toBeDefined()
})

test("the time reads relative, and holds the moment for a hover or a keyboard", async () => {
  renderMessages()

  const time = screen.getByRole("button", { name: "1m ago" })

  expect(time.querySelector("time")?.getAttribute("dateTime")).toBe(
    new Date(ask.createdAt).toISOString()
  )
  expect(screen.getByRole("button", { name: "just now" })).toBeDefined()

  fireEvent.focus(time)

  expect((await screen.findByRole("tooltip")).textContent).toBe(
    absoluteTime(ask.createdAt)
  )
})

test("person messages identify the sender and reserve You for the viewer", () => {
  const author = { id: "maya", name: "Maya Lund", isViewer: false }

  render(
    <TooltipProvider>
      <PersonMessage message={{ ...ask, author }} now={now} />
      <PersonMessage
        message={{ ...ask, id: "mine", author: { ...author, isViewer: true } }}
        now={now}
      />
    </TooltipProvider>
  )

  expect(screen.getByText("Maya Lund")).toBeDefined()
  expect(screen.getByText("You")).toBeDefined()
})
