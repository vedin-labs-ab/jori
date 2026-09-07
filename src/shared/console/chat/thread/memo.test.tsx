// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ask, now, reply } from "../../../../../test/chat"
import { Markdown } from "../../markdown"
import { type ChatDraft, type ChatRun } from "../types"
import { ChatThread } from "."
import { ChatDraftTurn } from "./draft"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))
vi.mock("../../markdown", () => ({
  Markdown: vi.fn(({ text }: { text: string }) => <p>{text}</p>),
}))

afterEach(cleanup)

const markdown = vi.mocked(Markdown)
// One array, as the host's memoized page is; a new one would be a new
// thread to lay out.
const messages = [ask, reply]
const onChoose = vi.fn()
const onOpenReference = vi.fn()
const resolveReference = () => undefined

/** The thread as a host renders it while a run answers, with the draft
 *  and the run's state the two things that move between renders. */
function liveThread(live: ChatRun, draft: ChatDraft) {
  return (
    <TooltipProvider>
      <ChatThread
        draft={<ChatDraftTurn draft={draft} />}
        hasMore={false}
        isLoading={false}
        live={live}
        messages={messages}
        now={now}
        onChoose={onChoose}
        onLoadMore={vi.fn()}
        onOpenReference={onOpenReference}
        progress={<p>Working on it</p>}
        resolveReference={resolveReference}
      />
    </TooltipProvider>
  )
}

/** The finished reply's renders; the draft's own markdown streams. */
const replyRenders = () =>
  markdown.mock.calls.filter(([props]) => props.streaming !== true).length

test("the draft and the run's state move without re-rendering the turns above them", () => {
  const { rerender } = render(
    liveThread({ id: "runs_1", status: "queued" }, { reasoning: "", text: "" })
  )

  expect(replyRenders()).toBe(1)

  rerender(
    liveThread(
      { id: "runs_1", status: "running" },
      { reasoning: "Reading the renewals table.", text: "" }
    )
  )

  expect(screen.getByText("Reading the renewals table.")).toBeDefined()
  expect(screen.getByText("Working on it")).toBeDefined()
  expect(replyRenders()).toBe(1)
})
