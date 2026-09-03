import { v } from "convex/values"
import { internalMutation, internalQuery } from "../../../_generated/server"
import { appendTranscript, listTranscript, tailTranscript } from "./data"
import { transcriptMessage } from "./schema"

export const append = internalMutation({
  args: {
    runId: v.id("runs"),
    messages: v.array(transcriptMessage),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    return await appendTranscript(ctx, args.runId, args.messages)
  },
})

export const list = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  returns: v.array(transcriptMessage),
  handler: async (ctx, args) => {
    return await listTranscript(ctx, args.runId)
  },
})

export const tail = internalQuery({
  args: {
    runId: v.id("runs"),
  },
  returns: v.object({
    assistant: v.union(transcriptMessage, v.null()),
    results: v.array(transcriptMessage),
  }),
  handler: async (ctx, args) => {
    return await tailTranscript(ctx, args.runId)
  },
})
