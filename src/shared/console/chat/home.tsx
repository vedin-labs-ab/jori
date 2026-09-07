import { ArrowRight, ChevronRight } from "lucide-react"
import { type ReactNode } from "react"
import { Suggestion } from "@/components/ui/suggestion"
import { cn } from "@/lib/utils"
import { ChatsPicker } from "../shell/chats"
import { ConsoleLink } from "../shell/link"
import { conversationDestination } from "../shell/routes"
import { relativeTime } from "../time"
import { type ChatSuggestion } from "./suggestions"
import { chatColumnClassName } from "./thread"
import { type ChatConversation } from "./types"

/** How many recent chats the home lists before the rest fold into the
 *  searchable list. */
const shownRecent = 4

/** Where a chat starts: the ask, a few things worth asking, and the
 *  conversations already had, when there are any. The group sits in the
 *  middle of the frame while it fits and scrolls once it does not; each
 *  block reads in the chat's column, the composer bringing its own. */
export function ChatHome({
  composer,
  now,
  onSuggestion,
  recent,
  suggestions,
}: {
  composer: ReactNode
  now: number
  /** Sends a suggestion as the first message. */
  onSuggestion: (text: string) => void
  /** The person's conversations, most recent first. */
  recent: ChatConversation[]
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
        {recent.length === 0 ? null : (
          <RecentConversations now={now} recent={recent} />
        )}
      </div>
    </div>
  )
}

/** A few asks as pills on one line, each behind its domain's icon. The
 *  line is the column, so the third pill steps aside where the column is
 *  too narrow for three, and what still overflows scrolls rather than
 *  wrapping; the line pads itself inside the scroll box so a pill's
 *  bottom edge is not clipped. */
function Suggestions({
  onSuggestion,
  suggestions,
}: {
  onSuggestion: (text: string) => void
  suggestions: readonly ChatSuggestion[]
}) {
  return (
    <ul
      aria-label="Suggestions"
      className={cn(
        chatColumnClassName,
        "@container -my-1 flex flex-nowrap justify-center gap-2 overflow-x-auto py-1"
      )}
    >
      {suggestions.map(({ icon: Icon, text }, index) => (
        <li
          className={cn("shrink-0", index >= 2 && "hidden @min-[38rem]:block")}
          key={text}
        >
          <Suggestion onClick={onSuggestion} suggestion={text}>
            <Icon aria-hidden className="text-muted-foreground" />
            {text}
          </Suggestion>
        </li>
      ))}
    </ul>
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
    <section
      aria-labelledby="chat-recent"
      className={cn(chatColumnClassName, "grid gap-1")}
    >
      <div className="flex items-center justify-between">
        <h3
          className="font-medium text-muted-foreground text-xs"
          id="chat-recent"
        >
          Recent
        </h3>
        {recent.length === shown.length ? null : (
          <ChatsPicker align="end" chats={recent} side="bottom">
            <button
              className="-mr-1.5 inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 font-medium text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
              type="button"
            >
              See all
              <ChevronRight aria-hidden className="size-3" />
            </button>
          </ChatsPicker>
        )}
      </div>
      {/* The rows bleed past the column, so their text lines up with the
          heading and the composer while the hover still has its inset. */}
      <ul className="-mx-3 divide-y">
        {shown.map((conversation) => (
          <li key={conversation.id}>
            <ConsoleLink
              className={rowClassName}
              {...conversationDestination(conversation.id)}
            >
              <span className="min-w-0 flex-1 truncate">
                {conversation.title}
              </span>
              <span className="shrink-0 text-muted-foreground text-xs">
                {relativeTime(conversation.updatedAt, now)}
              </span>
              <RowArrow />
            </ConsoleLink>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** A row that goes somewhere: its text on one line, and the arrow that
 *  opens under the pointer to say so, taking no room until it does. */
const rowClassName =
  "group/row flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted"

function RowArrow() {
  return (
    <ArrowRight
      aria-hidden
      className="-ml-3 h-4 w-0 shrink-0 text-muted-foreground opacity-0 transition-[width,margin,opacity] duration-150 group-focus-visible/row:ml-0 group-focus-visible/row:w-4 group-focus-visible/row:opacity-100 group-hover/row:ml-0 group-hover/row:w-4 group-hover/row:opacity-100"
    />
  )
}
