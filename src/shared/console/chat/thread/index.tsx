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
  type ChatMessage,
  type ChatRun,
  isLiveRun,
  type ReferenceTarget,
  type ResolveReference,
} from "../types"
import { answeredParts, answerKey } from "./answers"
import { ChoiceChips } from "./choices"
import { JoriMessage, PersonMessage } from "./message"
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
 *  as `progress` and shows under that turn while the run is live; the
 *  reply being written arrives as `draft` and shows as Jori's message
 *  until the finished one takes its place. */
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
  /** The reply's text so far, while one is streaming. */
  draft: string | null
  hasMore: boolean
  isLoading: boolean
  live: ChatRun | null
  messages: ChatMessage[]
  now: number
  onChoose: ChooseHandler
  onLoadMore: () => void
  onOpenReference: (target: ReferenceTarget) => void
  /** What the live run is doing: the working row, its log, its requests. */
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
            {isLive ? (
              <MessageScrollerItem>{progress}</MessageScrollerItem>
            ) : null}
            {draft === null ? null : (
              <MessageScrollerItem>
                <JoriMessage streaming>
                  <Markdown streaming text={draft} />
                </JoriMessage>
              </MessageScrollerItem>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton aria-label="Scroll to latest" />
      </MessageScroller>
    </MessageScrollerProvider>
  )
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
