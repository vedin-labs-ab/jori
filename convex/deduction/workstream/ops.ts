import { type Infer, v } from "convex/values"
import {
  citationListSchema,
  nullableString,
  nullableStringList,
  opSchema,
  stringList,
  stringValue,
} from "../engine/judge"
import { citation } from "../engine/rules"
import { type PassScope } from "../schema"

// The workstream judge contract. Efforts are the only citable sources.
// There is no journal op at this stage: narrative lives on efforts, and a
// workstream's timeline is the journals of its members. `assign` carries no
// citations because the effort being assigned is itself the evidence; the
// applier records it as such.
export const workstreamOp = v.union(
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
    op: v.literal("assign"),
    effortId: v.string(),
    beliefId: v.string(),
    why: v.optional(v.string()),
  })
)
export type WorkstreamOp = Infer<typeof workstreamOp>

const citations = citationListSchema(["effort"])

const mutationSchemas = [
  opSchema("create", {
    tempId: stringValue,
    name: stringValue,
    aliases: stringList,
    brief: stringValue,
    parentId: nullableString,
    citations: {
      ...citations,
      description: "Cited efforts become members of the new workstream.",
    },
  }),
  opSchema("update", {
    beliefId: stringValue,
    name: nullableString,
    aliases: nullableStringList,
    brief: nullableString,
    parentId: nullableString,
    citations,
  }),
  opSchema("status", {
    beliefId: stringValue,
    to: { type: "string", enum: ["confirm", "close", "reject", "reopen"] },
    citations,
  }),
  opSchema("merge", {
    beliefId: stringValue,
    into: stringValue,
    citations,
  }),
  opSchema("assign", {
    effortId: {
      ...stringValue,
      description:
        "Effort to attach. Skip efforts already on the right workstream.",
    },
    beliefId: stringValue,
    why: {
      ...nullableString,
      description: "One line: why this effort belongs to this workstream.",
    },
  }),
]

const mutations = {
  type: "array",
  items: { anyOf: mutationSchemas },
}

// Consolidation must look at the effort layer blind before touching the
// roster: bodiesOfWork is that look, made a schema requirement rather than a
// prompt suggestion. The applier never reads it.
export function workstreamOutputSchema(scope: PassScope) {
  if (scope === "window") {
    return {
      type: "object",
      additionalProperties: false,
      required: ["mutations"],
      properties: { mutations },
    }
  }

  return {
    type: "object",
    additionalProperties: false,
    required: ["bodiesOfWork", "mutations"],
    properties: {
      bodiesOfWork: {
        type: "array",
        description:
          "From the efforts alone, ignoring the current roster: the named bodies of work people would list.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "efforts"],
          properties: { name: stringValue, efforts: stringList },
        },
      },
      mutations,
    },
  }
}
