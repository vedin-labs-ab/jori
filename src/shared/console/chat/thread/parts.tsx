import { isReplyQuestion } from "@contracts/replies/parts"
import { type OpenTarget } from "../pane/tabs"
import { type ChatMessage, type ResolveReference, targetKey } from "../types"
import { ChoiceChips } from "./choices"
import { QuestionBundle } from "./question"
import { ReferenceCard } from "./reference"

/** Choosing from a reply's options sends an ordinary message: the values
 *  each part received, and the text the view composed for them. A
 *  reply's questions are answered together; a chip answers its part
 *  alone. */
export type ChooseHandler = (
  messageId: string,
  answers: { part: number; values: string[] }[],
  text: string
) => void

/** A reply's parts: each reference as a card, its questions as one
 *  bundle wherever the reply stands, and its chips after the latest
 *  reply only. Chips are next steps, so they leave with the next message. */
export function ReplyParts({
  answered,
  message,
  onChoose,
  onOpenReference,
  resolveReference,
  showChips,
}: {
  answered: Map<string, Map<number, string[]>>
  message: ChatMessage
  onChoose: ChooseHandler
  onOpenReference: OpenTarget
  resolveReference: ResolveReference
  showChips: boolean
}) {
  const references = message.parts.filter((part) => part.kind === "reference")
  const questions = message.parts.flatMap((part, index) =>
    isReplyQuestion(part) ? [{ index, part }] : []
  )
  const chips = message.parts.flatMap((part, index) =>
    part.kind === "choices" && !isReplyQuestion(part) ? [{ index, part }] : []
  )

  return (
    <>
      {references.length === 0 ? null : (
        <div className="flex flex-wrap gap-2">
          {references.map((part) => (
            <ReferenceCard
              key={targetKey(part.target)}
              onOpen={onOpenReference}
              reference={resolveReference(part.target)}
              target={part.target}
            />
          ))}
        </div>
      )}
      {questions.length === 0 ? null : (
        <QuestionBundle
          answers={answered.get(message.id)}
          onAnswer={(answers, text) => onChoose(message.id, answers, text)}
          questions={questions}
        />
      )}
      {showChips
        ? chips.map(({ index, part }) => (
            <ChoiceChips
              key={index}
              onChoose={(values, text) =>
                onChoose(message.id, [{ part: index, values }], text)
              }
              options={part.options}
            />
          ))
        : null}
    </>
  )
}
