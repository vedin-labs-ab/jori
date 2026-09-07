import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { internalAction } from "../_generated/server"
import { type SendResult, send } from "./bird/send"

export const run = internalAction({
  args: { id: v.id("emailSubmissions") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const submission: Doc<"emailSubmissions"> | null = await ctx.runMutation(
      internal.email.queue.claim,
      { id }
    )
    if (!submission?.message) {
      return null
    }
    let result: SendResult
    try {
      result = await send(id, submission.region, submission.message)
    } catch {
      result = { kind: "failed", failure: "configuration" }
    }
    await ctx.runMutation(internal.email.queue.finish, {
      id,
      attempt: submission.attempts,
      result,
    })
    return null
  },
})
