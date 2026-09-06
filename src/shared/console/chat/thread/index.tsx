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
import {
  type ChatDraft,
  type ChatMessage,
  type ChatRun,
  endedWithoutReply,
  isLiveRun,
  type ReferenceTarget,
  type ResolveReference,
} from "../types"
import { answeredParts, answerKey } from "./answers"
import { ChoiceChips } from "./choices"
import { ChatDraftTurn } from "./draft"
import { JoriMessage, PersonMessage } from "./message"
import { RunNotice } from "./notice"
import { QuestionCard } from "./question"
import { ReferenceCard } from "./reference"

/** The column every chat surface reads in. */
export const chatColumnClassName = "mx-auto w-full max-w-[44rem] px-4 md:px-6"

/** Choosing from a reply's options sends an ordinary message: the values
 *  chosen, and the text the view composed for them. */
export type ChooseHandler = (
  messageId: string,
  partIndex: number,
  values: string[],
  text: string
) => void

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
  messages,
  now,
  onChoose,
  onLoadMore,
  onOpenReference,
  progress,
  resolveReference,
}: {
  /** The turn so far, while one is streaming. */
  draft: ChatDraft | null
  hasMore: boolean
  isLoading: boolean
  live: ChatRun | null
  messages: ChatMessage[]
  now: number
  onChoose: ChooseHandler
  onLoadMore: () => void
  onOpenReference: (target: ReferenceTarget) => void
  /** What the live run is doing: the working line, its log, its requests. */
  progress: ReactNode
  resolveReference: ResolveReference
}) {
  const answered = useMemo(() => answeredParts(messages), [messages])
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
            {messages.map((message) => (
              <MessageScrollerItem
                key={message.id}
                messageId={message.id}
                scrollAnchor={message.id === anchorId}
              >
                {message.role === "person" ? (
                  <PersonMessage
                    context={
                      message.context === undefined
                        ? undefined
                        : resolveReference(message.context)
                    }
                    message={message}
                    now={now}
                  />
                ) : (
                  <JoriMessage>
                    <Markdown text={message.text} />
                    <ReplyParts
                      answered={answered}
                      message={message}
                      onChoose={onChoose}
                      onOpenReference={onOpenReference}
                      resolveReference={resolveReference}
                      showChips={
                        message.id === lastId && !isLive && draft === null
                      }
                    />
                  </JoriMessage>
                )}
              </MessageScrollerItem>
            ))}
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

/** A reply's parts in order: each reference as a card, then its choices
 *  as chips after the latest reply, or as a question card wherever they
 *  stand. Chips are next steps, so they leave with the next message. */
function ReplyParts({
  answered,
  message,
  onChoose,
  onOpenReference,
  resolveReference,
  showChips,
}: {
  answered: Map<string, string[]>
  message: ChatMessage
  onChoose: ChooseHandler
  onOpenReference: (target: ReferenceTarget) => void
  resolveReference: ResolveReference
  showChips: boolean
}) {
  const references = message.parts.filter((part) => part.kind === "reference")
  const choices = message.parts.flatMap((part, index) =>
    part.kind === "choices" ? [{ index, part }] : []
  )

  return (
    <>
      {references.length === 0 ? null : (
        <div className="flex flex-wrap gap-2">
          {references.map((part) => (
            <ReferenceCard
              key={`${part.target.kind}:${part.target.id}`}
              onOpen={onOpenReference}
              reference={resolveReference(part.target)}
              target={part.target}
            />
          ))}
        </div>
      )}
      {choices.map(({ index, part }) =>
        part.prompt === undefined ? (
          showChips ? (
            <ChoiceChips
              key={index}
              onChoose={(values, text) =>
                onChoose(message.id, index, values, text)
              }
              options={part.options}
            />
          ) : null
        ) : (
          <QuestionCard
            answered={answered.get(answerKey(message.id, index))}
            key={index}
            onAnswer={(values, text) =>
              onChoose(message.id, index, values, text)
            }
            part={part}
          />
        )
      )}
    </>
  )
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
