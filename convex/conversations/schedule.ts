import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { summaryDebounceMs, summaryMaxDelayMs } from "./limits"

export type SummarySchedule = {
  runAt: number
  summarizeAt: number
}

export function nextSummarySchedule(
  now: number,
  summarizeAt: number | undefined
): SummarySchedule {
  const ceiling = summarizeAt ?? now + summaryMaxDelayMs

  return {
    runAt: Math.min(now + summaryDebounceMs, ceiling),
    summarizeAt: ceiling,
  }
}

export async function scheduleConversationSummary(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  now: number
) {
  const schedule = nextSummarySchedule(now, conversation.summarizeAt)

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
    summarizeAt: schedule.summarizeAt,
  })
}
