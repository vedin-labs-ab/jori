import { type MutationCtx } from "../_generated/server"
import { type TransitionInput } from "./schema"

export async function recordTransition(
  ctx: MutationCtx,
  args: TransitionInput
) {
  await ctx.db.insert("transitions", {
    tenantId: args.tenantId,
    subject: args.subject,
    type: args.type,
    createdAt: Date.now(),
  })
}
