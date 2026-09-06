// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  type ChatMessage,
  type ChatReference,
  type ChatRun,
  type ReferenceTarget,
} from "../types"
import { ChatThread, type ChooseHandler } from "."

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

afterEach(cleanup)

const now = 1_700_000_000_000
const table: ChatReference = {
  kind: "table",
  id: "collections_renewals",
  name: "Customer renewals",
  detail: "Finance › Renewals",
}

function message(
  overrides: Partial<ChatMessage> & { id: string }
): ChatMessage {
  return {
    role: "jori",
    text: "",
    parts: [],
    createdAt: now - 60_000,
    ...overrides,
  }
}

const ask = message({
  id: "m1",
  role: "person",
  text: "Which renewals are at risk?",
  context: { kind: "table", id: "collections_renewals" },
})

const reply = message({
  id: "m2",
  text: "**Harbor House** renews Sep 24 and is at risk.",
  parts: [
    {
      kind: "reference",
      target: { kind: "table", id: "collections_renewals" },
    },
    { kind: "reference", target: { kind: "job", id: "jobs_gone" } },
    {
      kind: "choices",
      options: [
        { label: "Remind them" },
        { label: "Show the table", value: "table" },
      ],
    },
  ],
})

const question = message({
  id: "m3",
  text: "One question first.",
  parts: [
    {
      kind: "choices",
      prompt: "Post the summary to #finance when done?",
      options: [
        { label: "Yes, post it", value: "post" },
        { label: "Keep it here" },
      ],
      freeform: true,
    },
  ],
})

function renderThread({
  draft = null,
  live = null,
  messages,
  onChoose = vi.fn<ChooseHandler>(),
  onOpenReference = vi.fn<(target: ReferenceTarget) => void>(),
}: {
  draft?: string | null
  live?: ChatRun | null
  messages: ChatMessage[]
  onChoose?: ChooseHandler
  onOpenReference?: (target: ReferenceTarget) => void
}) {
  return render(
    <TooltipProvider>
      <ChatThread
        draft={draft}
        hasMore={false}
        isLoading={false}
        live={live}
        messages={messages}
        now={now}
        onChoose={onChoose}
        onLoadMore={vi.fn()}
        onOpenReference={onOpenReference}
        progress={<p>Working on it</p>}
        resolveReference={(target) =>
          target.id === "collections_renewals" ? table : undefined
        }
      />
    </TooltipProvider>
  )
}

test("renders both turns: the ask in its bubble with its context, the reply as prose with its cards", () => {
  const onOpenReference = vi.fn<(target: ReferenceTarget) => void>()

  renderThread({ messages: [ask, reply], onOpenReference })

  expect(screen.getByText("Which renewals are at risk?")).toBeDefined()
  expect(screen.getByText("1m ago")).toBeDefined()
  expect(screen.getAllByText("Customer renewals")).toHaveLength(2)
  expect(screen.getByText("Harbor House").tagName).toBe("STRONG")

  fireEvent.click(screen.getByRole("button", { name: /Customer renewals/ }))

  expect(onOpenReference).toHaveBeenCalledWith({
    kind: "table",
    id: "collections_renewals",
  })
  // The job the host could not resolve is named by its kind and opens
  // nothing.
  expect(screen.getByText("Job")).toBeDefined()
  expect(screen.getByText("· No longer available")).toBeDefined()
  expect(screen.queryByRole("button", { name: /Job/ })).toBeNull()
})

test("a chip after the latest reply sends its label; chips leave once a later message exists", () => {
  const onChoose = vi.fn<ChooseHandler>()
  const { unmount } = renderThread({ messages: [ask, reply], onChoose })

  fireEvent.click(screen.getByRole("button", { name: "Show the table" }))

  expect(onChoose).toHaveBeenCalledWith("m2", 2, ["table"], "Show the table")

  unmount()
  renderThread({
    messages: [
      ask,
      reply,
      message({ id: "m4", role: "person", text: "Show the table" }),
    ],
  })

  expect(screen.queryByRole("button", { name: "Show the table" })).toBeNull()
})

test("chips wait while a run is live or a reply is streaming", () => {
  renderThread({
    messages: [ask, reply],
    live: { id: "runs_1", status: "running" },
    draft: "Looking at",
  })

  expect(screen.queryByRole("button", { name: "Remind them" })).toBeNull()
  expect(screen.getByText("Working on it")).toBeDefined()
  expect(screen.getByText("Looking at")).toBeDefined()
})

test("answering a question composes the message from the labels, then the card locks", () => {
  const onChoose = vi.fn<ChooseHandler>()
  const { unmount } = renderThread({ messages: [ask, question], onChoose })

  fireEvent.click(screen.getByRole("radio", { name: "Yes, post it" }))
  fireEvent.click(screen.getByRole("button", { name: "Answer" }))

  expect(onChoose).toHaveBeenCalledWith("m3", 0, ["post"], "Yes, post it")

  unmount()
  renderThread({
    messages: [
      ask,
      question,
      message({
        id: "m5",
        role: "person",
        text: "Yes, post it",
        answer: { messageId: "m3", part: 0, values: ["post"] },
      }),
    ],
  })

  expect(screen.queryByRole("radio")).toBeNull()
  expect(screen.queryByRole("button", { name: "Answer" })).toBeNull()
  expect(
    screen
      .getByText("Yes, post it", { selector: "li" })
      .getAttribute("aria-current")
  ).toBe("true")
  expect(
    screen.getByText("Keep it here").getAttribute("aria-current")
  ).toBeNull()
})

test("an answer in the person's own words is sent as written", () => {
  const onChoose = vi.fn<ChooseHandler>()

  renderThread({ messages: [ask, question], onChoose })

  fireEvent.change(screen.getByRole("textbox", { name: "Your own answer" }), {
    target: { value: "Post it Monday" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Answer" }))

  expect(onChoose).toHaveBeenCalledWith(
    "m3",
    0,
    ["Post it Monday"],
    "Post it Monday"
  )
})
