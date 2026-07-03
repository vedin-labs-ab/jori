import { type Infer, v } from "convex/values"

// The judge contract. Ids cross the wire as strings, never as v.id: the model
// may emit temp ids or garbage, and the applier's job is to discard invalid
// ops, not to crash argument validation.

export const citation = v.union(
  v.object({ event: v.string(), why: v.optional(v.string()) }),
  v.object({ conversation: v.string(), why: v.optional(v.string()) })
)
export type Citation = Infer<typeof citation>

export const judgeOp = v.union(
  v.object({
    op: v.literal("create"),
    tempId: v.string(),
    name: v.string(),
    aliases: v.array(v.string()),
    brief: v.string(),
    parentId: v.optional(v.string()),
    citations: v.array(citation),
  }),
  v.object({
    op: v.literal("update"),
    beliefId: v.string(),
    name: v.optional(v.string()),
    aliases: v.optional(v.array(v.string())),
    brief: v.optional(v.string()),
    parentId: v.optional(v.string()),
    citations: v.array(citation),
  }),
  v.object({
    op: v.literal("status"),
    beliefId: v.string(),
    to: v.union(
      v.literal("confirm"),
      v.literal("close"),
      v.literal("reject"),
      v.literal("reopen")
    ),
    citations: v.array(citation),
  }),
  v.object({
    op: v.literal("merge"),
    beliefId: v.string(),
    into: v.string(),
    citations: v.array(citation),
  }),
  v.object({
    op: v.literal("journal"),
    beliefId: v.string(),
    entry: v.string(),
    citations: v.array(citation),
  })
)
export type JudgeOp = Infer<typeof judgeOp>

// Strict-mode JSON schema mirror of judgeOp for the structured model call.
// Optionals become nullable because strict mode requires every property.

const stringValue = { type: "string" }
const nullableString = { type: ["string", "null"] }
const stringList = { type: "array", items: { type: "string" } }
const nullableStringList = {
  type: ["array", "null"],
  items: { type: "string" },
}

const citationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["event", "conversation", "why"],
  properties: {
    event: { ...nullableString, description: "Event id from the input." },
    conversation: {
      ...nullableString,
      description: "Conversation id from the input.",
    },
    why: {
      ...nullableString,
      description: "One line: what this source shows, as read right now.",
    },
  },
}

const citationList = { type: "array", items: citationSchema }

export const judgeOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["mutations"],
  properties: {
    mutations: {
      type: "array",
      items: {
        anyOf: [
          opSchema("create", {
            tempId: stringValue,
            name: stringValue,
            aliases: stringList,
            brief: stringValue,
            parentId: nullableString,
            citations: citationList,
          }),
          opSchema("update", {
            beliefId: stringValue,
            name: nullableString,
            aliases: nullableStringList,
            brief: nullableString,
            parentId: nullableString,
            citations: citationList,
          }),
          opSchema("status", {
            beliefId: stringValue,
            to: {
              type: "string",
              enum: ["confirm", "close", "reject", "reopen"],
            },
            citations: citationList,
          }),
          opSchema("merge", {
            beliefId: stringValue,
            into: stringValue,
            citations: citationList,
          }),
          opSchema("journal", {
            beliefId: stringValue,
            entry: stringValue,
            citations: citationList,
          }),
        ],
      },
    },
  },
}

// Strict-mode providers require a `type` key on every schema node, so the
// discriminator is a single-value enum rather than a bare const.
function opSchema(op: string, properties: Record<string, unknown>) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["op", ...Object.keys(properties)],
    properties: { op: { type: "string", enum: [op] }, ...properties },
  }
}
