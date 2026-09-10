import { type ReactNode, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { ConsoleListLoading } from "../../list/loading"
import {
  createMentionCatalog,
  emptyMentionSources,
  type MentionSources,
} from "../../mentions/sources"
import { type OpenTarget } from "../pane/tabs"
import {
  type ChatContextUsage,
  type ChatMessage,
  type ChatRun,
  isLiveRun,
  lastMessage,
  type ResolveReference,
} from "../types"
import { answerAuthors, answeredParts, answeringMessages } from "./answers"
import { CondensedNotice } from "./notice"
import { type ChooseHandler } from "./parts"
import { AnchorOnTurn, ThreadTail } from "./tail"
import { Turn } from "./turn"

/** The column every chat surface reads in. */
export const chatColumnClassName = "mx-auto w-full max-w-[44rem] px-4 md:px-6"

export type { ChooseHandler } from "./parts"

/** A conversation, oldest first, anchored on the person's latest turn so
 *  the reply grows under it. What the run is doing arrives from the host
 *  as `progress` and the reply being written as `draft`; together they
 *  are one turn of Jori's under that anchor, until the finished message
 *  takes its place. Each finished turn is memoized, so the host's
 *  callbacks must keep their identity for the list to stay put while the
 *  tail changes. */
export function ChatThread({
  draft,
  hasMore,
  isLoading,
  live,
  mentions = emptyMentionSources,
  messages,
  now,
  onChoose,
  onLoadMore,
  onOpenReference,
  progress,
  resolveReference,
  usage,
}: {
  /** The reply as far as it has come, as `ChatDraftTurn` or a component
   *  the host binds to its draft. A node rather than the text, so the
   *  writes that land every few hundred milliseconds re-render the turn
   *  being written and not the messages above it. */
  draft?: ReactNode
  hasMore: boolean
  isLoading: boolean
  live: ChatRun | null
  /** What a person's message may mention by name, so its tokens read as
   *  chips; resource tokens always do. */
  mentions?: MentionSources
  messages: ChatMessage[]
  now: number
  onChoose: ChooseHandler
  onLoadMore: () => void
  onOpenReference: OpenTarget
  /** What the live run is doing: the working line, its log, its requests.
   *  Left out, a live run shows nothing until its draft arrives. */
  progress?: ReactNode
  resolveReference: ResolveReference
  /** The latest run's context use, for the note that it condensed. */
  usage?: ChatContextUsage | null
}) {
  const answered = useMemo(() => answeredParts(messages), [messages])
  const authors = useMemo(() => answerAuthors(messages), [messages])
  const answering = useMemo(() => answeringMessages(messages), [messages])
  const catalog = useMemo(() => createMentionCatalog(mentions), [mentions])
  const isLive = isLiveRun(live)
  const anchor = lastMessage(messages, "person")
  const anchorId = anchor?.id
  const lastId = messages.at(-1)?.id

  return (
    <MessageScrollerProvider defaultScrollPosition="last-anchor">
      <MessageScroller className="min-h-0 flex-1">
        <MessageScrollerViewport
          aria-label="Conversation"
          className="[--scroll-fade-reveal:24px]"
          preserveScrollOnPrepend
        >
          <MessageScrollerContent
            className={`${chatColumnClassName} gap-6 py-4`}
          >
            <AnchorOnTurn
              anchorId={
                anchor?.author?.isViewer === false ? undefined : anchorId
              }
            />
            {hasMore ? (
              <EarlierMessages isLoading={isLoading} onLoadMore={onLoadMore} />
            ) : null}
            {isLoading && messages.length === 0 ? <ConsoleListLoading /> : null}
            {messages.map((message) =>
              answering.has(message.id) ? null : (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={message.id === anchorId}
                >
                  <Turn
                    answerAuthor={authors.get(message.id)}
                    answered={answered}
                    catalog={catalog}
                    message={message}
                    now={now}
                    onChoose={onChoose}
                    onOpenReference={onOpenReference}
                    resolveReference={resolveReference}
                    showChips={message.id === lastId && !isLive}
                  />
                </MessageScrollerItem>
              )
            )}
            {usage?.condensed ? (
              <MessageScrollerItem>
                <CondensedNotice runId={usage.runId} />
              </MessageScrollerItem>
            ) : null}
            <ThreadTail
              draft={draft}
              live={live}
              messages={messages}
              progress={progress}
            />
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton aria-label="Scroll to latest" />
      </MessageScroller>
    </MessageScrollerProvider>
  )
}

/** The way to the page before the oldest one loaded. */
function EarlierMessages({
  isLoading,
  onLoadMore,
}: {
  isLoading: boolean
  onLoadMore: () => void
}) {
  return (
    <div className="flex justify-center">
      <Button
        disabled={isLoading}
        onClick={onLoadMore}
        size="sm"
        type="button"
        variant="ghost"
      >
        Show earlier messages
      </Button>
    </div>
  )
}
