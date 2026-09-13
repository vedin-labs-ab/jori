// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { type GenericId } from "convex/values"
import { type ComponentProps } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { ChatThread } from "@/shared/console/chat/thread"
import { ConversationTurns } from "./turns"

vi.mock("./draft", () => ({ ConversationDraft: () => null }))
vi.mock("@/shared/console/chat/thread", () => ({
  ChatThread: vi.fn(({ onChoose }: ComponentProps<typeof ChatThread>) => (
    <button
      onClick={() => onChoose("message", [{ part: 0, values: ["yes"] }], "Yes")}
      type="button"
    >
      Yes
    </button>
  )),
}))

afterEach(cleanup)

test("answers keep a stable handler and follow the current conversation and sender", () => {
  const send = vi.fn().mockResolvedValue({ status: "sent" })
  const props: ComponentProps<typeof ConversationTurns> = {
    conversationId: "first" as GenericId<"conversations">,
    live: { run: null, context: null },
    onOpenReference: vi.fn(),
    organizationId: "organization",
    page: { hasMore: false, isLoading: false, loadMore: vi.fn(), messages: [] },
    resolveReference: vi.fn(),
    send,
  }
  const { rerender } = render(<ConversationTurns {...props} />)
  const choose = vi.mocked(ChatThread).mock.lastCall?.[0].onChoose
  rerender(<ConversationTurns {...props} />)
  expect(vi.mocked(ChatThread).mock.lastCall?.[0].onChoose).toBe(choose)

  fireEvent.click(screen.getByRole("button", { name: "Yes" }))
  expect(send).toHaveBeenCalledWith({
    conversationId: "first",
    text: "Yes",
    answer: { messageId: "message", answers: [{ part: 0, values: ["yes"] }] },
  })

  // A refused send is already reported by useSendMessage. The click must
  // consume the rejection and remain available for another attempt.
  const nextSend = vi.fn().mockRejectedValue(new Error("Refused"))
  rerender(
    <ConversationTurns
      {...props}
      conversationId={"second" as GenericId<"conversations">}
      send={nextSend}
    />
  )
  fireEvent.click(screen.getByRole("button", { name: "Yes" }))
  expect(nextSend).toHaveBeenCalledWith({
    conversationId: "second",
    text: "Yes",
    answer: { messageId: "message", answers: [{ part: 0, values: ["yes"] }] },
  })
  expect(send).toHaveBeenCalledTimes(1)
})
