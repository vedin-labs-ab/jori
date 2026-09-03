import { defineTable } from "convex/server"
import { v } from "convex/values"
import { type JsonObject } from "../../../../contracts/json"

export const transcriptMessage = v.union(
  v.object({
    role: v.union(v.literal("system"), v.literal("user")),
    content: v.string(),
  }),
  v.object({
    role: v.literal("assistant"),
    content: v.union(v.string(), v.null()),
    toolCalls: v.optional(
      v.array(v.object({ id: v.string(), name: v.string(), args: v.any() }))
    ),
  }),
  v.object({
    role: v.literal("tool"),
    toolCallId: v.string(),
    toolName: v.string(),
    content: v.string(),
  })
)

type TranscriptToolCall = {
  args: JsonObject
  id: string
  name: string
}

/** Written out rather than inferred from the validator: tool arguments are
 *  any JSON object, and `Infer` would widen them to `any` for every reader. */
export type TranscriptMessage =
  | { content: string; role: "system" | "user" }
  | {
      content: string | null
      role: "assistant"
      toolCalls?: TranscriptToolCall[]
    }
  | { content: string; role: "tool"; toolCallId: string; toolName: string }

/**
 * The model-facing history of one run: drained session messages, person
 * contexts, handoff notes, assistant responses and tool results, in the order
 * the model sees them. The prompt prefix is rebuilt each turn and is not
 * stored here.
 */
export const transcript = defineTable({
  organizationId: v.string(),
  runId: v.id("runs"),
  /** 1-based and dense within a run, so a tail reads backwards by order. */
  order: v.number(),
  message: transcriptMessage,
}).index("by_run_and_order", ["runId", "order"])
