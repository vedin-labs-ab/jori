// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import {
  ask,
  message,
  now,
  renderThread,
  reply,
} from "../../../../../test/chat"
import { type OpenTarget } from "../pane/tabs"
import { type ChooseHandler } from "."

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

afterEach(cleanup)

test("renders both turns: the ask in its bubble without a separate filing row, the reply as prose with its cards", () => {
  const onOpenReference = vi.fn<OpenTarget>()

  renderThread({ messages: [ask, reply], onOpenReference })

  expect(screen.getByText("Which renewals are at risk?")).toBeDefined()
  expect(screen.getAllByText("Customer renewals")).toHaveLength(1)
  expect(screen.getByText("Harbor House").tagName).toBe("STRONG")

  fireEvent.click(screen.getByRole("button", { name: /Customer renewals/ }))

  expect(onOpenReference).toHaveBeenCalledWith({
    kind: "table",
    id: "collections_renewals",
  })

  // A double click keeps the resource, the way a tab's does.
  fireEvent.doubleClick(
    screen.getByRole("button", { name: /Customer renewals/ })
  )

  expect(onOpenReference).toHaveBeenLastCalledWith(
    { kind: "table", id: "collections_renewals" },
    { pinned: true }
  )
  // The job the host could not resolve is named by its kind and opens
  // nothing.
  expect(screen.getByText("Job")).toBeDefined()
  expect(screen.getByText("No longer available")).toBeDefined()
  expect(screen.queryByRole("button", { name: /Job/ })).toBeNull()
})

test("a chip after the latest reply sends its label; chips leave once a later message exists", () => {
  const onChoose = vi.fn<ChooseHandler>()
  const { unmount } = renderThread({ messages: [ask, reply], onChoose })

  fireEvent.click(screen.getByRole("button", { name: "Show the table" }))

  expect(onChoose).toHaveBeenCalledWith(
    "m2",
    [{ part: 2, values: ["table"] }],
    "Show the table"
  )

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

test("a live run and its draft are one turn of Jori's, and chips wait for it", () => {
  renderThread({
    messages: [ask, reply],
    live: { id: "runs_1", status: "running" },
    draft: { reasoning: "Reading the renewals table.", text: "Looking at" },
  })

  expect(screen.queryByRole("button", { name: "Remind them" })).toBeNull()

  // The progress and the draft are one turn rather than two messages, and
  // that turn continues the reply above it — a run starts from the
  // person's message, so a reply standing last under a live run is the
  // run's own heads-up — under the one mark the reply wears.
  const turn = screen.getByText("Looking at").closest("[aria-busy]")

  expect(screen.getAllByTitle("Jori logo")).toHaveLength(1)
  expect(turn?.querySelectorAll("title")).toHaveLength(0)
  expect(turn?.textContent).toContain("Working on it")
  expect(screen.getByRole("button", { name: "Thought" })).toBeDefined()
  // The draft's turn carries no actions of its own.
  expect(turn?.querySelector("time")).toBeNull()
})

test("before the reply's text, the turn shows the thinking as it streams", () => {
  renderThread({
    messages: [ask, reply],
    live: { id: "runs_1", status: "running" },
    draft: { reasoning: "Reading the renewals table.", text: "" },
  })

  expect(screen.getByText("Reading the renewals table.")).toBeDefined()
})

test("the working row stands on its own, with its mark, after the person's message", () => {
  renderThread({
    messages: [ask],
    live: { id: "runs_1", status: "running" },
  })

  expect(screen.getAllByTitle("Jori logo")).toHaveLength(1)
  expect(
    screen
      .getByText("Working on it")
      .closest("[aria-busy], .flex")
      ?.querySelectorAll("title")
  ).toHaveLength(1)
})

test("a run that failed or was stopped says so under the last turn, with the way to it", () => {
  renderThread({
    messages: [ask],
    live: {
      id: "runs_1",
      status: "failed",
      error: "Sandbox timed out\nat step 3",
      endedAt: now - 30_000,
    },
  })

  const notice = screen.getByRole("status")

  expect(notice.textContent).toContain("Jori couldn't finish")
  expect(notice.textContent).toContain("Sandbox timed out")
  expect(notice.textContent).not.toContain("at step 3")
  expect(
    screen
      .getByRole("link", { name: /See the run in Activity/ })
      .getAttribute("href")
  ).toBe("/runs?run=runs_1")
  expect(screen.queryByText("Working on it")).toBeNull()

  cleanup()
  renderThread({
    messages: [ask],
    live: { id: "runs_2", status: "stopped", endedAt: now - 30_000 },
  })

  expect(screen.getByRole("status").textContent).toBe(
    "Jori stopped before finishingSee the run in Activity"
  )

  // A reply that landed after the end is the answer; nothing to say.
  cleanup()
  renderThread({
    messages: [ask, reply],
    live: { id: "runs_3", status: "stopped", endedAt: now - 120_000 },
  })

  expect(screen.queryByRole("status")).toBeNull()
})
