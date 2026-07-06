import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { nextDebounceSchedule } from "../shared/debounce"
import { summaryDebounceMs, summaryMaxDelayMs } from "./limits"

export async function scheduleConversationSummary(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  now: number
) {
  const schedule = nextDebounceSchedule({
    now,
    ceilingAt: conversation.summarizeAt,
    debounceMs: summaryDebounceMs,
    maxDelayMs: summaryMaxDelayMs,
  })

  if (conversation.functionId !== undefined) {
    await ctx.scheduler.cancel(conversation.functionId)
  }

  const functionId = await ctx.scheduler.runAt(
    schedule.runAt,
    internal.conversations.summarize.run,
    { conversationId: conversation._id }
  )

  await ctx.db.patch(conversation._id, {
    functionId,
    summarizeAt: schedule.ceilingAt,
  })
}
