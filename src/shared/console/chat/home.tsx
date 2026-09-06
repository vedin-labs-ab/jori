import { MessageSquare } from "lucide-react"
import { type ReactNode } from "react"
import { Suggestion, Suggestions } from "@/components/ui/suggestion"
import { ConsoleEmptyState } from "../list/empty"
import { ConsoleLink } from "../shell/link"
import { conversationDestination } from "../shell/routes"
import { relativeTime } from "../time"
import { chatColumnClassName } from "./thread"
import { type ChatConversation } from "./types"

/** Where a chat starts: the ask, a few things worth asking, and the
 *  conversations already had. The composer arrives bound from the host. */
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
      <div className={`${chatColumnClassName} grid gap-6 py-8`}>
        <h2 className="font-heading font-medium text-lg">What needs doing?</h2>
        <div className="-mx-4 md:-mx-6 grid gap-3">
          {composer}
          {suggestions.length === 0 ? null : (
            <Suggestions
              aria-label="Suggestions"
              className="w-full flex-wrap px-4 md:px-6"
              role="group"
            >
              {suggestions.map((suggestion) => (
                <Suggestion
                  key={suggestion}
                  onClick={onSuggestion}
                  suggestion={suggestion}
                />
              ))}
            </Suggestions>
          )}
        </div>
        <RecentConversations now={now} recent={recent} />
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
  if (recent.length === 0) {
    return (
      <ConsoleEmptyState
        className="border"
        description="Conversations with Jori are kept here to come back to."
        icon={MessageSquare}
        title="No conversations yet"
      />
    )
  }

  return (
    <section aria-labelledby="chat-recent" className="grid gap-2">
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
