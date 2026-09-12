import { memo } from "react"
import { Markdown } from "../../markdown"
import { type MentionCatalog } from "../../mentions/scan"
import { type ResolveReference } from "../../references"
import { type OpenTarget } from "../pane/tabs"
import { type ChatMessage } from "../types"
import { JoriMessage, MessageActions, PersonMessage } from "./message"
import { type ChooseHandler, ReplyParts } from "./parts"

/** One message as its side shows it: the person's in a bubble with its
 *  context and its chips, Jori's as prose with its parts under the mark.
 *  Rendered once per message and left alone while the thread's tail
 *  changes under it. */
export const Turn = memo(function Turn({
  answerAuthor,
  answered,
  catalog,
  message,
  now,
  onChoose,
  onOpenReference,
  resolveReference,
  showChips,
}: {
  answerAuthor?: ChatMessage["author"]
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
        answerAuthor={answerAuthor}
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
})
