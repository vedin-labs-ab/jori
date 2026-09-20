import { type ReferenceTarget } from "./references"

// A reply is text plus embedded parts. The contract is surface-agnostic:
// which kinds a surface accepts follows from its communication
// capabilities, and a surface renders the kinds it supports.

export type ReplyReference = {
  kind: "reference"
  target: ReferenceTarget
}

export type ReplyChoice = {
  label: string
  value?: string
  /** One line under the label, when the label alone would leave the
   *  requester guessing what choosing it means. */
  description?: string
}

/** One primitive with two renderings: without a prompt it is a row of
 *  chips after the message; with a prompt it is a question, and the
 *  questions of one reply are answered together. Either way the answer
 *  is an ordinary next message. */
export type ReplyChoices = {
  kind: "choices"
  prompt?: string
  /** One line under the prompt: what the answer decides, or what to
   *  weigh. */
  description?: string
  options: ReplyChoice[]
  select?: "one" | "many"
  freeform?: boolean
  required?: boolean
}

/** A choices part with a prompt: a question the requester answers. */
export type ReplyQuestion = ReplyChoices & { prompt: string }

export type ReplyPart = ReplyReference | ReplyChoices
export type ReplyPartKind = ReplyPart["kind"]

export const replyPartKinds = ["reference", "choices"] as const

export const replyPartLimits = {
  references: 6,
  /** Choices parts with a prompt: the questions of one reply. */
  questions: 5,
  /** Choices parts without a prompt: the one row of chips. */
  chips: 1,
  options: 6,
} as const

export function isReplyQuestion(part: ReplyPart): part is ReplyQuestion {
  return part.kind === "choices" && part.prompt !== undefined
}
