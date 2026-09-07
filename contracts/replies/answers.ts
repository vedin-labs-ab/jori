import { isRecord, readStringArray } from "../json"
import { type ReferenceKind, referenceKinds } from "./parts"

// What a person's message can carry besides its text: the resource or
// folder the conversation was opened about, and the questions it
// answers. The run reads the text; these let the console render intent.

export type MessageContext = { kind: ReferenceKind; id: string }

/** The values one choices part received. */
export type PartAnswer = {
  /** The part's index within the reply message. */
  part: number
  values: string[]
}

/** The reply a message answers, and the answer to each of its choices
 *  parts: a reply's questions are answered together, in one message. */
export type ChoicesAnswer = {
  /** The reply message holding the answered parts. */
  messageId: string
  answers: PartAnswer[]
}

export function readMessageContext(value: unknown): MessageContext | undefined {
  if (!isRecord(value) || !isRecord(value.context)) {
    return undefined
  }

  const { kind, id } = value.context

  return isReferenceKind(kind) && typeof id === "string" && id !== ""
    ? { kind, id }
    : undefined
}

export function readChoicesAnswer(value: unknown): ChoicesAnswer | undefined {
  if (!isRecord(value) || !isRecord(value.answer)) {
    return undefined
  }

  const { messageId, answers } = value.answer

  return typeof messageId === "string" && Array.isArray(answers)
    ? { messageId, answers: answers.flatMap(readPartAnswer) }
    : undefined
}

/** An entry without an integer part and a values array is no answer; a
 *  values list that holds something other than strings keeps the
 *  strings. */
function readPartAnswer(value: unknown): PartAnswer[] {
  if (!isRecord(value)) {
    return []
  }

  const { part, values } = value

  return typeof part === "number" &&
    Number.isInteger(part) &&
    Array.isArray(values)
    ? [{ part, values: readStringArray(values) }]
    : []
}

function isReferenceKind(value: unknown): value is ReferenceKind {
  return referenceKinds.some((kind) => kind === value)
}
