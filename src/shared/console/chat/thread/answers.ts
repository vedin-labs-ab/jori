import { type ReplyChoice, type ReplyChoices } from "@contracts/replies/parts"
import { type ChatMessage } from "../types"

// How a choices part is answered: the values a person's message carries
// point back at the part, and the message's text is composed from the
// labels of what was chosen.

/** The values each answered part received, keyed by `answerKey`. */
export function answeredParts(messages: ChatMessage[]) {
  const answered = new Map<string, string[]>()

  for (const message of messages) {
    if (message.answer !== undefined) {
      answered.set(
        answerKey(message.answer.messageId, message.answer.part),
        message.answer.values
      )
    }
  }

  return answered
}

export function answerKey(messageId: string, part: number) {
  return `${messageId}:${part}`
}

/** What a chosen option sends: its value when it has one, else its label. */
export function choiceValue(option: ReplyChoice) {
  return option.value ?? option.label
}

/** The message a person sends by answering: the chosen options' labels,
 *  and anything written in their own words as written. */
export function composeAnswer(part: ReplyChoices, values: string[]) {
  return values
    .map(
      (value) =>
        part.options.find((option) => choiceValue(option) === value)?.label ??
        value
    )
    .join(", ")
}
