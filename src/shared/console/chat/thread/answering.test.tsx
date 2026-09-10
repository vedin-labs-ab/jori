// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ask, message, question, renderThread } from "../../../../../test/chat"
import { type ChooseHandler } from "."

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

afterEach(cleanup)

test("answering a question composes the message from the prompt and the labels, then the question locks", () => {
  const onChoose = vi.fn<ChooseHandler>()
  const { unmount } = renderThread({ messages: [ask, question], onChoose })

  fireEvent.click(screen.getByRole("radio", { name: "Yes, post it" }))
  fireEvent.click(screen.getByRole("button", { name: "Answer" }))

  expect(onChoose).toHaveBeenCalledWith(
    "m3",
    [{ part: 0, values: ["post"] }],
    "Post the summary to #finance when done? Yes, post it"
  )

  unmount()
  renderThread({
    messages: [
      ask,
      question,
      message({
        id: "m5",
        author: { id: "maya", name: "Maya Lund", isViewer: false },
        role: "person",
        text: "Post the summary to #finance when done? Yes, post it",
        answer: { messageId: "m3", answers: [{ part: 0, values: ["post"] }] },
      }),
    ],
  })

  expect(screen.getByText("Answered by Maya Lund")).toBeDefined()
  expect(screen.queryByRole("radio")).toBeNull()
  expect(screen.queryByRole("button", { name: "Answer" })).toBeNull()
  // The answers are marked on the questions; the message that carried
  // them is not a turn of its own.
  expect(
    screen.queryByText("Post the summary to #finance when done? Yes, post it")
  ).toBeNull()
  expect(
    screen
      .getByText("Yes, post it", { selector: "li" })
      .getAttribute("aria-current")
  ).toBe("true")
  expect(
    screen.getByText("Keep it here").getAttribute("aria-current")
  ).toBeNull()
})
