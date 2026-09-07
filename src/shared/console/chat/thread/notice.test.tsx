// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { type ChatContextUsage, type ChatMessage } from "../types"
import { ChatThread } from "."
import { CondensedNotice } from "./notice"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

afterEach(cleanup)

const now = 1_700_000_000_000
const usage: ChatContextUsage = {
  condensed: true,
  model: "openai/gpt-x",
  runId: "runs_1",
  turn: null,
  usedTokens: 90_000,
  windowTokens: 200_000,
}

test("says the context was condensed and links the run in Activity", () => {
  render(<CondensedNotice runId="runs_1" />)

  expect(screen.getByRole("status").textContent).toContain(
    "Jori condensed earlier context to keep going"
  )
  expect(
    screen
      .getByRole("link", { name: /See the run in Activity/ })
      .getAttribute("href")
  ).toContain("runs_1")
})

test("the thread notes a run that condensed earlier context, under its turns", () => {
  const { rerender } = render(thread(usage))

  expect(
    screen.getByText("Jori condensed earlier context to keep going")
  ).toBeDefined()

  rerender(thread({ ...usage, condensed: false }))

  expect(screen.queryByText(/condensed earlier context/)).toBeNull()
})

function thread(usage: ChatContextUsage) {
  const messages: ChatMessage[] = [
    {
      id: "m1",
      role: "person",
      text: "Which renewals are at risk?",
      parts: [],
      createdAt: now - 120_000,
    },
    {
      id: "m2",
      role: "jori",
      text: "Three of them.",
      parts: [],
      createdAt: now - 60_000,
    },
  ]

  return (
    <TooltipProvider>
      <ChatThread
        hasMore={false}
        isLoading={false}
        live={null}
        messages={messages}
        now={now}
        onChoose={vi.fn()}
        onLoadMore={vi.fn()}
        onOpenReference={vi.fn()}
        progress={null}
        resolveReference={() => undefined}
        usage={usage}
      />
    </TooltipProvider>
  )
}
