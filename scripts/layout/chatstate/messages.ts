import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { demoConversations } from "@/landing/demo/fixtures/chat"
import { type ChatMessage } from "@/shared/console/chat/types"
import { delay, type localService } from "./service"

export function useMessages(
  state: string,
  service: ReturnType<typeof localService>,
  now: number
) {
  const seeds = useMemo(() => demoConversations(now)[0].messages, [now])
  const [messages, setMessages] = useState(seeds)
  const more = useMore(state, setMessages, now)
  useEffect(() => {
    let attempts = 0
    service.controls.send = async (args) => {
      await delay()
      attempts += 1
      if (state === "send-reject" && attempts === 1) {
        throw new Error("Layout fixture rejected this send.")
      }
      setMessages((messages) => [
        ...messages,
        {
          id: `layout-sent-${attempts}`,
          role: "person",
          author: { id: "layout-person", name: "Maya Lund", isViewer: true },
          text: String(args.text),
          parts: [],
          createdAt: Date.now(),
        },
      ])
      return { status: "sent", conversationId: "conversations_renewals" }
    }
  }, [service, state])
  return { messages, ...more }
}

function useMore(
  state: string,
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  now: number
) {
  const [isLoading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(state === "pagination")
  const onLoadMore = useCallback(() => {
    setLoading(true)
    void delay().then(() => {
      setMessages((messages) => [...earlierMessages(now), ...messages])
      setHasMore(false)
      setLoading(false)
    })
  }, [now, setMessages])
  return { hasMore, isLoading, onLoadMore }
}

function earlierMessages(now: number): ChatMessage[] {
  return Array.from({ length: 24 }, (_, index) => ({
    id: `layout-older-${index}`,
    role: index % 2 === 0 ? "person" : "jori",
    author:
      index % 2 === 0
        ? { id: "layout-person", name: "Maya Lund", isViewer: true }
        : undefined,
    text:
      index % 2 === 0
        ? `Earlier question ${index / 2 + 1}: Which customer renewals changed?`
        : "The current owners and renewal dates are recorded in the customer table.",
    parts: [],
    createdAt: now - 3_600_000 - (24 - index) * 60_000,
  }))
}
