import { isRecord, readStringArray } from "../json"
import { type ReferenceKind, referenceKinds } from "./parts"

// What a person's message can carry besides its text: the resource or
// folder the conversation was opened about, and the choices part it
// answers. The run reads the text; these let the console render intent.

export type MessageContext = { kind: ReferenceKind; id: string }

export type ChoicesAnswer = {
  /** The reply message holding the answered part. */
  messageId: string
  /** The part's index within that message. */
  part: number
  values: string[]
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

  const { messageId, part, values } = value.answer

  // An answer without its values is no answer; a values list that holds
  // something other than strings keeps the strings.
  return typeof messageId === "string" &&
    typeof part === "number" &&
    Number.isInteger(part) &&
    Array.isArray(values)
    ? { messageId, part, values: readStringArray(values) }
    : undefined
}

function isReferenceKind(value: unknown): value is ReferenceKind {
  return referenceKinds.some((kind) => kind === value)
}
