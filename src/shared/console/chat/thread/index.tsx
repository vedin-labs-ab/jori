import { type ReactNode, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/components/ui/message-scroller"
import { ConsoleListLoading } from "../../list/loading"
import { Markdown } from "../../markdown"
import { type MentionCatalog } from "../../mentions/scan"
import {
  createMentionCatalog,
  emptyMentionSources,
  type MentionSources,
} from "../../mentions/sources"
import { type OpenTarget } from "../pane/tabs"
import {
  type ChatContextUsage,
  type ChatDraft,
  type ChatMessage,
  type ChatRun,
  endedWithoutReply,
  isLiveRun,
  type ResolveReference,
} from "../types"
import { answeredParts, answeringMessages } from "./answers"
import { CondensedNotice } from "./condensed"
import { ChatDraftTurn } from "./draft"
import { JoriMessage, MessageActions, PersonMessage } from "./message"
import { RunNotice } from "./notice"
import { type ChooseHandler, ReplyParts } from "./parts"

/** The column every chat surface reads in. */
export const chatColumnClassName = "mx-auto w-full max-w-[44rem] px-4 md:px-6"

export type { ChooseHandler } from "./parts"

/** A conversation, oldest first, anchored on the person's latest turn so
 *  the reply grows under it. What the run is doing arrives from the host
 *  as `progress` and the reply being written as `draft`; together they
 *  are one turn of Jori's under that anchor, until the finished message
 *  takes its place. */
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
  /** The turn so far, while one is streaming. */
  draft: ChatDraft | null
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
  /** What the live run is doing: the working line, its log, its requests. */
  progress: ReactNode
  resolveReference: ResolveReference
  /** The latest run's context use, for the note that it condensed. */
  usage?: ChatContextUsage | null
}) {
  const answered = useMemo(() => answeredParts(messages), [messages])
  const answering = useMemo(() => answeringMessages(messages), [messages])
  const catalog = useMemo(() => createMentionCatalog(mentions), [mentions])
  const isLive = isLiveRun(live)
  const anchorId = lastPersonId(messages)
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
            <AnchorOnTurn anchorId={anchorId} />
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
                    answered={answered}
                    catalog={catalog}
                    message={message}
                    now={now}
                    onChoose={onChoose}
                    onOpenReference={onOpenReference}
                    resolveReference={resolveReference}
                    showChips={
                      message.id === lastId && !isLive && draft === null
                    }
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

/** One message as its side shows it: the person's in a bubble with its
 *  context and its chips, Jori's as prose with its parts under the mark. */
function Turn({
  answered,
  catalog,
  message,
  now,
  onChoose,
  onOpenReference,
  resolveReference,
  showChips,
}: {
  answered: Map<string, Map<number, string[]>>
  catalog: MentionCatalog
  message: ChatMessage
  now: number
  onChoose: ChooseHandler
  onOpenReference: OpenTarget
  resolveReference: ResolveReference
  showChips: boolean
}) {
  if (message.role === "person") {
    return (
      <PersonMessage
        catalog={catalog}
        context={
          message.context === undefined
            ? undefined
            : resolveReference(message.context)
        }
        message={message}
        now={now}
        onOpenReference={onOpenReference}
        resolveReference={resolveReference}
      />
    )
  }

  return (
    <JoriMessage>
      <Markdown text={message.text} />
      <ReplyParts
        answered={answered}
        message={message}
        onChoose={onChoose}
        onOpenReference={onOpenReference}
        resolveReference={resolveReference}
        showChips={showChips}
      />
      <MessageActions message={message} now={now} />
    </JoriMessage>
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

/** After the messages: one turn of Jori's while the run works — what it
 *  is doing, then the reply as far as it has come, under a single mark —
 *  or, when the run ended without the reply, the notice that says so. A
 *  run starts from the person's message, so a message of Jori's standing
 *  last under a live run is that run's own heads-up, and the work goes on
 *  under it rather than as a new turn. */
function ThreadTail({
  draft,
  live,
  messages,
  progress,
}: {
  draft: ChatDraft | null
  live: ChatRun | null
  messages: ChatMessage[]
  progress: ReactNode
}) {
  const isLive = isLiveRun(live)

  if (isLive || draft !== null) {
    return (
      <MessageScrollerItem>
        <JoriMessage
          continued={messages.at(-1)?.role === "jori"}
          streaming={draft !== null}
        >
          {isLive ? progress : null}
          {draft === null ? null : <ChatDraftTurn draft={draft} />}
        </JoriMessage>
      </MessageScrollerItem>
    )
  }

  return endedWithoutReply(messages, live) ? (
    <MessageScrollerItem>
      <RunNotice run={live} />
    </MessageScrollerItem>
  ) : null
}

/** Brings each new turn of the person's to the top of the view as it is
 *  sent, so the reply grows under it; the scroller anchors the first
 *  render the same way on its own. */
function AnchorOnTurn({ anchorId }: { anchorId: string | undefined }) {
  const { scrollToMessage } = useMessageScroller()

  useEffect(() => {
    if (anchorId !== undefined) {
      scrollToMessage(anchorId, { align: "start" })
    }
  }, [anchorId, scrollToMessage])

  return null
}

/** The person's latest turn, which the thread anchors on. */
function lastPersonId(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "person") {
      return messages[index]?.id
    }
  }

  return undefined
}
