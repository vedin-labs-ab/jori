import { isRecord } from "../json"
import { type JsonSchemaObject } from "../schema/types"
import { validateJsonSchemaValue } from "../schema/validate"
import {
  isReplyQuestion,
  type ReplyPart,
  type ReplyPartKind,
  replyPartKinds,
  replyPartLimits,
} from "./parts"
import { referenceKinds } from "./references"

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
