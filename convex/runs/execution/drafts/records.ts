import { v } from "convex/values"
import { internalMutation } from "../../../_generated/server"
import { clearRunDraft, writeRunDraft } from "./data"

export const write = internalMutation({
  args: {
    runId: v.id("runs"),
    turn: v.number(),
    text: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await writeRunDraft(ctx, args)

    return null
  },
})

export const clear = internalMutation({
  args: {
    runId: v.id("runs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await clearRunDraft(ctx, args.runId)

    return null
  },
})
