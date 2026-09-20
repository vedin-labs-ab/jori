import { isRecord } from "../json"
import {
  type JsonSchemaObject,
  validateJsonSchemaValue,
} from "../schema/validate"
import {
  type ReferenceKind,
  type ReferenceTarget,
  referenceKinds,
} from "./references"

// A reply is text plus embedded parts. The contract is surface-agnostic:
// which kinds a surface accepts follows from its communication
// capabilities, and a surface renders the kinds it supports.

export type ReplyReference = {
  kind: "reference"
  target: ReferenceTarget
}

// A message mentions a resource as `+[kind:id]`: the kind and the id ride
// inside the brackets, so a token needs no catalog and can never be prose
// by accident. The composer and the server read the same grammar.

const resourceTokenSource = `\\+\\[(${referenceKinds.join("|")}):([a-z0-9_-]+)\\]`

/** A resource token at the start of a text. */
export const resourceTokenPattern = new RegExp(`^${resourceTokenSource}`, "i")

/** Every resource token in a text whose `+` starts the text or follows
 *  whitespace: quoted examples, sums, and paths stay text, as they do in
 *  the composer. */
export const resourceTokensPattern = new RegExp(
  `(?<![^\\s])${resourceTokenSource}`,
  "gi"
)

export function resourceToken(target: ReferenceTarget) {
  return `+[${target.kind}:${target.id}]`
}

/** The target a text names as one resource token and nothing else, or
 *  nothing for a text of another shape. */
export function parseResourceToken(text: string): ReferenceTarget | null {
  const match = resourceTokenPattern.exec(text)

  return match === null || match[0].length !== text.length
    ? null
    : { kind: match[1].toLowerCase() as ReferenceKind, id: match[2] }
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

const referenceSchema: JsonSchemaObject = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "target"],
  properties: {
    kind: { const: "reference" },
    target: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "id"],
      properties: {
        kind: { type: "string", enum: [...referenceKinds] },
        id: { type: "string", minLength: 1 },
      },
      description:
        "A resource this reply is about: one you created, changed, or want the requester to open, or a chat that has more on it. Use the id a tool returned.",
    },
  },
}

const choicesSchema: JsonSchemaObject = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "options"],
  properties: {
    kind: { const: "choices" },
    prompt: {
      type: "string",
      description:
        "Ask one thing. Omit it to offer next steps the requester can send with one click.",
    },
    description: {
      type: "string",
      description:
        "One line under the prompt: what the answer decides, or what to weigh. Omit it when the prompt says enough.",
    },
    options: {
      type: "array",
      minItems: 1,
      maxItems: replyPartLimits.options,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label"],
        properties: {
          label: { type: "string", minLength: 1 },
          value: { type: "string" },
          description: {
            type: "string",
            description:
              "One line under the label: what choosing it means. Omit it when the label says enough.",
          },
        },
      },
    },
    select: { type: "string", enum: ["one", "many"] },
    freeform: {
      type: "boolean",
      description: "Let the requester answer in their own words instead.",
    },
    required: {
      type: "boolean",
      description:
        "Off, the requester may skip the question. On unless you say otherwise.",
    },
  },
}

const partSchemas: Record<ReplyPartKind, JsonSchemaObject> = {
  reference: referenceSchema,
  choices: choicesSchema,
}

export function replyPartsSchema(
  kinds: readonly ReplyPartKind[]
): JsonSchemaObject {
  return {
    type: "array",
    maxItems:
      replyPartLimits.references +
      replyPartLimits.questions +
      replyPartLimits.chips,
    items: { anyOf: kinds.map((kind) => partSchemas[kind]) },
    description:
      "Content embedded after the text: resource references, questions the requester answers together, and next steps as chips.",
  }
}

/** Validates and returns the parts of a reply, or throws with the first
 *  issues. The kinds a surface accepts are the only ones admitted. */
export function readReplyParts(
  value: unknown,
  kinds: readonly ReplyPartKind[]
): ReplyPart[] {
  if (value === undefined || value === null) {
    return []
  }

  const issues = validateJsonSchemaValue(
    replyPartsSchema(kinds),
    value,
    "parts"
  )

  if (issues.length > 0) {
    throw new Error(
      issues
        .slice(0, 5)
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("; ")
    )
  }

  const parts = value as ReplyPart[]

  assertPartCounts(parts)

  return parts
}

/** Reads stored parts without throwing: anything that no longer validates
 *  renders as nothing rather than breaking the message. */
export function parseReplyParts(value: unknown): ReplyPart[] {
  if (!isRecord(value)) {
    return []
  }

  try {
    return readReplyParts(value.parts, replyPartKinds)
  } catch {
    return []
  }
}

export function isReplyQuestion(part: ReplyPart): part is ReplyQuestion {
  return part.kind === "choices" && part.prompt !== undefined
}

function assertPartCounts(parts: ReplyPart[]) {
  const references = parts.filter((part) => part.kind === "reference").length
  const questions = parts.filter(isReplyQuestion).length
  const chips = parts.filter(
    (part) => part.kind === "choices" && !isReplyQuestion(part)
  ).length

  if (references > replyPartLimits.references) {
    throw new Error(
      `parts: at most ${replyPartLimits.references} references per reply`
    )
  }

  if (questions > replyPartLimits.questions) {
    throw new Error(
      `parts: at most ${replyPartLimits.questions} questions per reply`
    )
  }

  if (chips > replyPartLimits.chips) {
    throw new Error(
      "parts: at most one choices part without a prompt per reply"
    )
  }
}
