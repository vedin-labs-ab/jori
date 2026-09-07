import { ArrowRight, MessagesSquare } from "lucide-react"
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
 *  too narrow for three, and what still overflows scrolls under a fade
 *  rather than wrapping. */
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
        "@container flex flex-nowrap justify-center gap-2 overflow-x-auto"
      )}
    >
      {suggestions.map(({ icon: Icon, text }, index) => (
        <li
          className={cn("shrink-0", index >= 2 && "hidden @xl:block")}
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

/** The chats had most recently, a few of them, and after them the way to
 *  every one, in the same searchable list the sidebar's rail opens. */
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
      <h3
        className="px-3 font-medium text-muted-foreground text-xs"
        id="chat-recent"
      >
        Recent
      </h3>
      <ul className="divide-y">
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
        {recent.length === shown.length ? null : (
          <li>
            <ChatsPicker chats={recent} side="bottom">
              <button
                className={cn(rowClassName, "text-muted-foreground")}
                type="button"
              >
                <MessagesSquare aria-hidden className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  See all {recent.length} chats
                </span>
                <RowArrow />
              </button>
            </ChatsPicker>
          </li>
        )}
      </ul>
    </section>
  )
}

/** A row that goes somewhere: its text on one line, and the arrow that
 *  appears under the pointer to say so. */
const rowClassName =
  "group/row flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted"

function RowArrow() {
  return (
    <ArrowRight
      aria-hidden
      className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-focus-visible/row:opacity-100 group-hover/row:opacity-100"
    />
  )
}
