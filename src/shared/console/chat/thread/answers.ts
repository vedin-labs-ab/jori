import {
  isReplyQuestion,
  type ReplyChoice,
  type ReplyChoices,
  type ReplyQuestion,
} from "@contracts/replies/parts"
import { type ChatMessage } from "../types"

// How a reply's choices are answered: a person's message carries the
// values each part received, and its text is composed from the labels of
// what was chosen, one line per question, so the run reads plain prose.

/** The values each answered part received: by the reply's message id,
 *  then by the part's index within it. */
export function answeredParts(messages: ChatMessage[]) {
  const answered = new Map<string, Map<number, string[]>>()

  for (const message of messages) {
    if (message.answer === undefined) {
      continue
    }

    const parts = answered.get(message.answer.messageId) ?? new Map()

    for (const { part, values } of message.answer.answers) {
      parts.set(part, values)
    }

    answered.set(message.answer.messageId, parts)
  }

  return answered
}

/** The last person to answer a reply's questions, matching its shown values. */
export function answerAuthors(messages: ChatMessage[]) {
  const authors = new Map<string, ChatMessage["author"]>()

  for (const message of messages) {
    if (message.answer !== undefined) {
      authors.set(message.answer.messageId, message.author)
    }
  }

  return authors
}

/** The messages the thread shows on the questions they answer rather than
 *  as turns of their own: a person's answers are marked on the questions
 *  themselves, so a bubble repeating them would say it twice. A chip's
 *  message stays a turn, since its label is what the person said next.
 *  A message whose questions are not loaded stays a turn too, so nothing
 *  the person sent is ever unseen. */
export function answeringMessages(messages: ChatMessage[]) {
  const byId = new Map(messages.map((message) => [message.id, message]))
  const answering = new Set<string>()

  for (const message of messages) {
    const reply = byId.get(message.answer?.messageId ?? "")
    const answersQuestion = message.answer?.answers.some(({ part }) => {
      const candidate = reply?.parts[part]

      return candidate !== undefined && isReplyQuestion(candidate)
    })

    if (answersQuestion === true) {
      answering.add(message.id)
    }
  }

  return answering
}

/** What a chosen option sends: its value when it has one, else its label. */
export function choiceValue(option: ReplyChoice) {
  return option.value ?? option.label
}

/** The answer to one part as words: the chosen options' labels, and
 *  anything written in the person's own words as written. */
export function answerLabels(part: ReplyChoices, values: string[]) {
  return values
    .map(
      (value) =>
        part.options.find((option) => choiceValue(option) === value)?.label ??
        value
    )
    .join(", ")
}

/** A prompt that closes its sentence takes the answer after a space; one
 *  that names a thing takes it after a colon. */
const closedPrompt = /[.!?:]$/

/** The message a reply's questions send once answered: a line per
 *  question, the prompt and then its answer. A question left without an
 *  answer has no line. */
export function composeAnswers(
  questions: Array<{ part: ReplyQuestion; values: string[] }>
) {
  return questions
    .filter(({ values }) => values.length > 0)
    .map(({ part, values }) => {
      const prompt = part.prompt.trim()
      const answer = answerLabels(part, values)

      return closedPrompt.test(prompt)
        ? `${prompt} ${answer}`
        : `${prompt}: ${answer}`
    })
    .join("\n")
}
