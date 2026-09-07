import { internal } from "./_generated/api"
import { type ActionCtx, type MutationCtx } from "./_generated/server"
import { type Message } from "./email/schema"

export type { Message } from "./email/schema"

/** Queue in the caller's transaction. Product templates know no provider. */
export async function sendEmail(
  ctx: Pick<MutationCtx, "runMutation"> | Pick<ActionCtx, "runMutation">,
  message: Message
) {
  await ctx.runMutation(internal.email.queue.enqueue, { message })
}
