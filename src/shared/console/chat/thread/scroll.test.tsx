// @vitest-environment jsdom
import { cleanup } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { ask, renderThread } from "../../../../../test/chat"

const scrollToMessage = vi.hoisted(() => vi.fn())

vi.mock("@/components/ui/message-scroller", async (original) => ({
  ...(await original<typeof import("@/components/ui/message-scroller")>()),
  useMessageScroller: () => ({ scrollToMessage }),
}))

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../../test/router")),
  ...(await import("../../../../../test/routing")),
}))

afterEach(() => {
  cleanup()
  scrollToMessage.mockClear()
})

test("teammates' messages do not interrupt a reader's position", () => {
  renderThread({
    messages: [
      { ...ask, author: { id: "maya", name: "Maya Lund", isViewer: false } },
    ],
  })

  expect(scrollToMessage).not.toHaveBeenCalled()
})

test("a viewer's own message anchors its reply", () => {
  renderThread({
    messages: [
      { ...ask, author: { id: "maya", name: "Maya Lund", isViewer: true } },
    ],
  })

  expect(scrollToMessage).toHaveBeenCalledWith(ask.id, { align: "start" })
})
