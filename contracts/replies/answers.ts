import { isRecord, readStringArray } from "../json"
import { type ReferenceKind, referenceKinds } from "./parts"

// What a person's message can carry besides its text: the resource or
// folder the conversation was opened about, the resources its text
// mentions, and the questions it answers. The run reads the text; these
// let the console render intent.

export type MessageContext = { kind: ReferenceKind; id: string }

/** How many of a kind the composer's picker is offered; the search
 *  narrows within. A kind at the cap reads as "25+" in the picker. */
export const mentionsPerKind = 25

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
  return isRecord(value) ? readReferenceTarget(value.context) : undefined
}

/** The resources a message's text mentions, each once, in the order
 *  kept. Anything that is not a target reads as nothing. */
export function readMessageReferences(value: unknown): MessageContext[] {
  if (!isRecord(value) || !Array.isArray(value.references)) {
    return []
  }

  const seen = new Set<string>()
  const references: MessageContext[] = []

  for (const candidate of value.references) {
    const reference = readReferenceTarget(candidate)
    const key =
      reference === undefined ? "" : `${reference.kind}:${reference.id}`

    if (reference !== undefined && !seen.has(key)) {
      seen.add(key)
      references.push(reference)
    }
  }

  return references
}

export function readReferenceTarget(
  value: unknown
): MessageContext | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  const { kind, id } = value

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
