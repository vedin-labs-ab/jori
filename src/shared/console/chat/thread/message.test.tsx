// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { absoluteTime } from "../../time"
import { type ChatMessage } from "../types"
import { JoriMessage, MessageActions, PersonMessage } from "./message"

afterEach(cleanup)

const now = 1_700_000_000_000

const ask: ChatMessage = {
  id: "m1",
  role: "person",
  text: "Which renewals are at risk?",
  parts: [],
  createdAt: now - 60_000,
}

const reply: ChatMessage = {
  id: "m2",
  role: "jori",
  text: "**Harbor House** renews Sep 24.",
  parts: [{ kind: "reference", target: { kind: "table", id: "t1" } }],
  createdAt: now - 30_000,
}

function renderMessages() {
  const writeText = vi.fn(() => Promise.resolve())

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  })
  render(
    <TooltipProvider>
      <PersonMessage context={undefined} message={ask} now={now} />
      <JoriMessage>
        <p>The reply</p>
        <MessageActions message={reply} now={now} />
      </JoriMessage>
    </TooltipProvider>
  )

  return writeText
}

test("the actions keep their place under the message but show on hover or focus", () => {
  renderMessages()

  const rows = screen
    .getAllByRole("button", { name: "Copy message" })
    .map((copy) => copy.parentElement)

  expect(rows).toHaveLength(2)

  for (const row of rows) {
    expect(row?.className).toContain("opacity-0")
    expect(row?.className).toContain("group-hover/message:opacity-100")
    expect(row?.className).toContain("focus-within:opacity-100")
    expect(row?.closest(".group\\/message")).not.toBeNull()
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
