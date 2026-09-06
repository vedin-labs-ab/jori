import { isRecord } from "../json"
import {
  type JsonSchemaObject,
  validateJsonSchemaValue,
} from "../schema/validate"

// A reply is text plus embedded parts. The contract is surface-agnostic:
// which kinds a surface accepts follows from its communication
// capabilities, and a surface renders the kinds it supports.

export const referenceKinds = [
  "file",
  "table",
  "store",
  "job",
  "folder",
  "run",
] as const

export type ReferenceKind = (typeof referenceKinds)[number]

export type ReplyReference = {
  kind: "reference"
  target: { kind: ReferenceKind; id: string }
}

export type ReplyChoice = { label: string; value?: string }

/** One primitive with two renderings: without a prompt it is a row of
 *  chips after the message; with a prompt it is a question card. Either
 *  way the answer is an ordinary next message. */
export type ReplyChoices = {
  kind: "choices"
  prompt?: string
  options: ReplyChoice[]
  select?: "one" | "many"
  freeform?: boolean
  required?: boolean
}

export type ReplyPart = ReplyReference | ReplyChoices
export type ReplyPartKind = ReplyPart["kind"]

export const replyPartKinds = ["reference", "choices"] as const

export const replyPartLimits = {
  references: 6,
  choices: 1,
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
        "A resource this reply is about: one you created, changed, or want the requester to open. Use the id a tool returned.",
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
        },
      },
    },
    select: { type: "string", enum: ["one", "many"] },
    freeform: {
      type: "boolean",
      description: "Let the requester answer in their own words instead.",
    },
    required: { type: "boolean" },
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
    maxItems: replyPartLimits.references + replyPartLimits.choices,
    items: { anyOf: kinds.map((kind) => partSchemas[kind]) },
    description:
      "Content embedded after the text: resource references and choices.",
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

function assertPartCounts(parts: ReplyPart[]) {
  const references = parts.filter((part) => part.kind === "reference").length
  const choices = parts.filter((part) => part.kind === "choices").length

  if (references > replyPartLimits.references) {
    throw new Error(
      `parts: at most ${replyPartLimits.references} references per reply`
    )
  }

  if (choices > replyPartLimits.choices) {
    throw new Error("parts: at most one choices part per reply")
  }
}
