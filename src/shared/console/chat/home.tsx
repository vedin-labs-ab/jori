import { ArrowRight, ChevronRight } from "lucide-react"
import { type ReactNode, useLayoutEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Suggestion } from "@/components/ui/suggestion"
import { cn } from "@/lib/utils"
import { ChatsPicker } from "../shell/chats"
import { ConsoleLink } from "../shell/link"
import { conversationDestination } from "../shell/routes"
import { relativeTime } from "../time"
import { VisibilityMark } from "../visibility/badge"
import { useChatDrag } from "./drag"
import { type ChatSuggestion } from "./suggestions"
import { chatColumnClassName } from "./thread"
import { type ChatConversation } from "./types"

/** How many recent chats the home lists before the rest fold into the
 *  searchable list. */
const shownRecent = 4
/** The rows the recent block's placeholder stands in for, by name. */
const placeholderRows = Array.from(
  { length: shownRecent },
  (_, index) => `row-${index + 1}`
)

/** Where a chat starts: the ask, a few things worth asking, and the
 *  conversations already had, when there are any. The group sits in the
 *  middle of the frame while it fits and scrolls once it does not; each
 *  block reads in the chat's column, the composer bringing its own. The
 *  recent block keeps its room while the host is still reading the
 *  list, so the composer does not jump when it lands. */
export function ChatHome({
  composer,
  now,
  onSuggestion,
  recent,
  suggestions,
}: {
  composer: ReactNode
  now: number
  /** Sends a suggestion as the first message; answering with a promise
   *  holds the pills until it settles. */
  onSuggestion: (text: string) => unknown
  /** The person's conversations, most recent first; nothing until the
   *  host has read them. */
  recent: ChatConversation[] | undefined
  suggestions: readonly ChatSuggestion[]
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-1 flex-col justify-center gap-6 py-8">
        <h2
          className={cn(
            chatColumnClassName,
            "text-center font-heading font-medium text-lg"
          )}
        >
          What needs doing?
        </h2>
        {composer}
        {suggestions.length === 0 ? null : (
          <Suggestions onSuggestion={onSuggestion} suggestions={suggestions} />
        )}
        <div className={cn(chatColumnClassName, "min-h-[12.1875rem]")}>
          {recent === undefined ? (
            <RecentPlaceholder />
          ) : recent.length === 0 ? null : (
            <RecentConversations now={now} recent={recent} />
          )}
        </div>
      </div>
    </div>
  )
}

/** Only whole suggestions that fit the chat column are visible. Hidden
 *  pills stay measurable, but cannot receive focus or pointer input. */
function Suggestions({
  onSuggestion,
  suggestions,
}: {
  onSuggestion: (text: string) => unknown
  suggestions: readonly ChatSuggestion[]
}) {
  const [pending, setPending] = useState<string>()
  const { listRef, visibleCount } = useFittingSuggestions(suggestions)
  const choose = (text: string) => {
    const result = onSuggestion(text)

    if (result instanceof Promise) {
      setPending(text)
      result.catch(() => undefined).finally(() => setPending(undefined))
    }
  }

  return (
    <div className={chatColumnClassName}>
      <ul
        aria-label="Suggestions"
        className="relative -my-1 flex min-h-8 flex-nowrap justify-center gap-2 overflow-clip py-1 [overflow-clip-margin:4px] pointer-coarse:min-h-11"
        ref={listRef}
      >
        {suggestions.map(({ icon: Icon, text }, index) => (
          <li
            className={cn(
              "w-max shrink-0",
              index >= visibleCount && "invisible absolute pointer-events-none"
            )}
            key={text}
          >
            <Suggestion
              className="transition-colors pointer-coarse:h-9"
              disabled={pending !== undefined}
              onClick={choose}
              suggestion={text}
            >
              {pending === text ? (
                <Spinner aria-label="Sending" />
              ) : (
                <Icon aria-hidden className="text-muted-foreground" />
              )}
              {text}
            </Suggestion>
          </li>
        ))}
      </ul>
    </div>
  )
}

function useFittingSuggestions(suggestions: readonly ChatSuggestion[]) {
  const [visibleCount, setVisibleCount] = useState(suggestions.length)
  const listRef = useRef<HTMLUListElement>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) {
      return
    }

    const items = suggestions.map((_, index) => list.children[index])
    const measure = () => {
      const width = list.getBoundingClientRect().width
      const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0
      let used = 0
      let count = 0

      for (const item of items) {
        used += item.getBoundingClientRect().width + (count === 0 ? 0 : gap)
        if (used > width) {
          break
        }
        count += 1
      }
      setVisibleCount(count)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    for (const item of items) {
      observer.observe(item)
    }
    return () => observer.disconnect()
  }, [suggestions])
  return { listRef, visibleCount }
}

/** The recent block's room while the list is on its way: its heading's
 *  line and the rows it shows, as skeletons. */
function RecentPlaceholder() {
  return (
    <div aria-busy aria-hidden className="grid grid-cols-1 gap-1">
      <div className="flex h-7 items-center">
        <Skeleton className="h-3 w-12" />
      </div>
      <ul className="divide-y">
        {placeholderRows.map((row) => (
          <li className="flex h-10 items-center" key={row}>
            <Skeleton className="h-4 w-1/2" />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The chats had most recently, a few of them; the heading carries the
 *  way to every one, in the same searchable list the sidebar's rail
 *  opens, once there are more than it shows. */
function RecentConversations({
  now,
  recent,
}: {
  now: number
  recent: ChatConversation[]
}) {
  const shown = recent.slice(0, shownRecent)

  return (
    <section aria-labelledby="chat-recent" className="grid grid-cols-1 gap-1">
      <div className="flex h-7 items-center justify-between">
        <h3
          className="font-medium text-muted-foreground text-xs"
          id="chat-recent"
        >
          Recent
        </h3>
        {recent.length === shown.length ? null : (
          <ChatsPicker align="end" chats={recent} side="bottom">
            <Button
              className="-mr-1.5 gap-0.5 px-1.5 text-muted-foreground"
              size="sm"
              type="button"
              variant="ghost"
            >
              See all
              <ChevronRight aria-hidden className="size-3" />
            </Button>
          </ChatsPicker>
        )}
      </div>
      <ul className="divide-y">
        {shown.map((conversation) => (
          <RecentConversation
            conversation={conversation}
            key={conversation.id}
            now={now}
          />
        ))}
      </ul>
    </section>
  )
}

function RecentConversation({
  conversation,
  now,
}: {
  conversation: ChatConversation
  now: number
}) {
  const drag = useChatDrag(conversation, "recent")

  return (
    <li>
      <ConsoleLink
        {...conversationDestination(conversation.id)}
        {...drag.attributes}
        {...drag.listeners}
        className={cn(
          rowClassName,
          "cursor-grab",
          drag.isDragSource && "opacity-50"
        )}
        draggable={false}
        onClickCapture={drag.onClickCapture}
        onPointerDownCapture={drag.onPointerDownCapture}
        ref={drag.setNodeRef}
      >
        <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
        <VisibilityMark {...conversation} ownerId={conversation.createdBy} />
        <span className="shrink-0 text-muted-foreground text-xs">
          {relativeTime(conversation.updatedAt, now)}
        </span>
        <RowArrow />
      </ConsoleLink>
    </li>
  )
}

/** A row that goes somewhere: its text on one line, and the arrow that
 *  opens under the pointer to say so, taking no room until it does. */
const rowClassName =
  "group/row flex w-full items-center gap-3 px-0 py-2.5 text-left text-sm outline-none transition-[background-color,padding] duration-150 hover:bg-muted hover:px-3 focus-visible:bg-muted focus-visible:px-3"

function RowArrow() {
  return (
    <ArrowRight
      aria-hidden
      className="-ml-3 h-4 w-0 shrink-0 text-muted-foreground opacity-0 transition-[width,margin,opacity] duration-150 group-focus-visible/row:ml-0 group-focus-visible/row:w-4 group-focus-visible/row:opacity-100 group-hover/row:ml-0 group-hover/row:w-4 group-hover/row:opacity-100"
    />
  )
}
