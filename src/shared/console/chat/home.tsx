import { ArrowRight, type LucideIcon, MessageSquare } from "lucide-react"
import { type ReactNode } from "react"
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
          <HomeSection id="chat-suggested" title="Suggested">
            {suggestions.map(({ icon, text }) => (
              <li key={text}>
                <button
                  className={rowClassName}
                  onClick={() => onSuggestion(text)}
                  type="button"
                >
                  <RowContent icon={icon}>{text}</RowContent>
                </button>
              </li>
            ))}
          </HomeSection>
        )}
        {recent.length === 0 ? null : (
          <RecentConversations now={now} recent={recent} />
        )}
      </div>
    </div>
  )
}

/** The chats had most recently, a few of them; the rest are a search
 *  away, in the same list the sidebar's rail opens. */
function RecentConversations({
  now,
  recent,
}: {
  now: number
  recent: ChatConversation[]
}) {
  const shown = recent.slice(0, shownRecent)
  const more = recent.length - shown.length

  return (
    <HomeSection
      footer={
        more === 0 ? null : (
          <ChatsPicker chats={recent} side="bottom">
            <button
              className="w-fit rounded-sm px-3 py-1 text-muted-foreground text-xs outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
              type="button"
            >
              and {more} more…
            </button>
          </ChatsPicker>
        )
      }
      id="chat-recent"
      title="Recent"
    >
      {shown.map((conversation) => (
        <li key={conversation.id}>
          <ConsoleLink
            className={rowClassName}
            {...conversationDestination(conversation.id)}
          >
            <RowContent
              icon={MessageSquare}
              meta={relativeTime(conversation.updatedAt, now)}
            >
              {conversation.title}
            </RowContent>
          </ConsoleLink>
        </li>
      ))}
    </HomeSection>
  )
}

/** A quiet heading over a list of rows, and after them whatever the
 *  section has to say about the rest. */
function HomeSection({
  children,
  footer,
  id,
  title,
}: {
  children: ReactNode
  footer?: ReactNode
  id: string
  title: string
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(chatColumnClassName, "grid gap-1")}
    >
      <h3 className="px-3 font-medium text-muted-foreground text-xs" id={id}>
        {title}
      </h3>
      <ul className="divide-y">{children}</ul>
      {footer}
    </section>
  )
}

const rowClassName =
  "group/row flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted"

/** What every row holds: the domain's icon, the text on one line, what
 *  the row has to say at the right, and the arrow that appears under the
 *  pointer to say the row goes somewhere. */
function RowContent({
  children,
  icon: Icon,
  meta,
}: {
  children: string
  icon: LucideIcon
  meta?: string
}) {
  return (
    <>
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {meta === undefined ? null : (
        <span className="shrink-0 text-muted-foreground text-xs">{meta}</span>
      )}
      <ArrowRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-focus-visible/row:opacity-100 group-hover/row:opacity-100"
      />
    </>
  )
}
