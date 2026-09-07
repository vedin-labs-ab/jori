import { type ReactNode } from "react"
import { Suggestion } from "@/components/ui/suggestion"
import { cn } from "@/lib/utils"
import { ConsoleLink } from "../shell/link"
import { conversationDestination } from "../shell/routes"
import { relativeTime } from "../time"
import { chatColumnClassName } from "./thread"
import { type ChatConversation } from "./types"

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
  recent: ChatConversation[]
  suggestions: readonly string[]
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
          <ul
            aria-label="Suggestions"
            className={cn(chatColumnClassName, "flex flex-wrap gap-2")}
          >
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <Suggestion onClick={onSuggestion} suggestion={suggestion} />
              </li>
            ))}
          </ul>
        )}
        {recent.length === 0 ? null : (
          <RecentConversations now={now} recent={recent} />
        )}
      </div>
    </div>
  )
}

function RecentConversations({
  now,
  recent,
}: {
  now: number
  recent: ChatConversation[]
}) {
  return (
    <section
      aria-labelledby="chat-recent"
      className={cn(chatColumnClassName, "grid gap-2")}
    >
      <h3
        className="font-medium text-muted-foreground text-xs"
        id="chat-recent"
      >
        Recent
      </h3>
      <ul className="divide-y rounded-md border">
        {recent.map((conversation) => (
          <li key={conversation.id}>
            <ConsoleLink
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
              {...conversationDestination(conversation.id)}
            >
              <span className="min-w-0 truncate">{conversation.title}</span>
              <span className="shrink-0 text-muted-foreground text-xs">
                {relativeTime(conversation.updatedAt, now)}
              </span>
            </ConsoleLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
