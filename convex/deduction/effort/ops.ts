import { type Infer, v } from "convex/values"
import {
  citationListSchema,
  nullableString,
  opSchema,
  stringValue,
} from "../engine/judge"
import { citation } from "../engine/rules"

// The effort judge contract. Ids cross the wire as strings, never as v.id:
// the model may emit temp ids or garbage, and the applier's job is to
// discard invalid ops, not to crash argument validation. No status op:
// dormancy is derived from seenAt, and merges tombstone.
export const effortOp = v.union(
  v.object({
    op: v.literal("create"),
    tempId: v.string(),
    name: v.string(),
    summary: v.string(),
    entry: v.string(),
    citations: v.array(citation),
  }),
  v.object({
    op: v.literal("update"),
    effortId: v.string(),
    name: v.optional(v.string()),
    summary: v.optional(v.string()),
    citations: v.array(citation),
  }),
  v.object({
    op: v.literal("journal"),
    effortId: v.string(),
    entry: v.string(),
    citations: v.array(citation),
  }),
  v.object({
    op: v.literal("merge"),
    effortId: v.string(),
    into: v.string(),
    citations: v.array(citation),
  })
)
export type EffortOp = Infer<typeof effortOp>

const citations = citationListSchema(["event", "conversation"])

export const effortOutputSchema = {
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
            summary: stringValue,
            entry: {
              ...stringValue,
              description: "First journal line: what happened in this window.",
            },
            citations,
          }),
          opSchema("update", {
            effortId: stringValue,
            name: nullableString,
            summary: nullableString,
            citations,
          }),
          opSchema("journal", {
            effortId: stringValue,
            entry: stringValue,
            citations,
          }),
          opSchema("merge", {
            effortId: stringValue,
            into: stringValue,
            citations,
          }),
        ],
      },
    },
  },
}
