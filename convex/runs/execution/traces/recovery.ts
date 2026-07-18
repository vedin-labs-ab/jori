import { v } from "convex/values"
import { type Doc } from "../../../_generated/dataModel"
import { internalQuery } from "../../../_generated/server"

// A task retry re-runs the model from scratch, so it cannot know what an
// earlier attempt already did. This query gives the rebuilt context the
// completed write actions — the side effects a retry must never repeat.

const maxActions = 40
const maxDetailLength = 160
const maxTraces = 1000

export const listActions = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  returns: v.array(
    v.object({
      name: v.string(),
      detail: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const traces = await ctx.db
      .query("traces")
      .withIndex("by_run_and_timestamp", (query) =>
        query.eq("runId", args.runId)
      )
      .take(maxTraces)

    return recoveryActions(traces)
  },
})

/** Completed write-tool calls, each joined to its call input for a
 *  recognizable one-line summary. */
export function recoveryActions(traces: Doc<"traces">[]) {
  const inputs = new Map<string, unknown>()

  for (const trace of traces) {
    if (trace.type === "tool.started") {
      inputs.set(callKey(trace), trace.data.input)
    }
  }

  const actions = []

  for (const trace of traces) {
    if (trace.type !== "tool.completed" || trace.data.tool.access !== "write") {
      continue
    }

    actions.push({
      name: trace.data.tool.name,
      detail: summarizeInput(inputs.get(callKey(trace))),
    })
  }

  return actions.slice(-maxActions)
}

function callKey(trace: { attempt: number; callId: string }) {
  return `${trace.attempt}:${trace.callId}`
}

function summarizeInput(input: unknown) {
  if (input === undefined || input === null) {
    return null
  }

  const text = JSON.stringify(input)

  if (typeof text !== "string") {
    return null
  }

  return text.length > maxDetailLength
    ? `${text.slice(0, maxDetailLength)}…`
    : text
}
