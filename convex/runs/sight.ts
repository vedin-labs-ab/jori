import { type Doc } from "../_generated/dataModel"
import { createConversationSight } from "../conversations/access"
import { type QueryLikeCtx } from "../shared/context"
import { createSight, type Sight } from "../visibility/sight"
import { executionPrincipalPersonId } from "./principal"

/** Credentials belong to the principal; resource access belongs to the
 *  conversation audience, so shared work never borrows a sender's rights. */
export async function createRunSight(
  ctx: QueryLikeCtx,
  run: Pick<Doc<"runs">, "organizationId" | "principal" | "conversationId">
): Promise<Sight> {
  if (run.conversationId !== undefined) {
    const conversation = await ctx.db.get(run.conversationId)

    if (
      conversation?.organizationId === run.organizationId &&
      conversation.surface === "console"
    ) {
      return createConversationSight(ctx, conversation)
    }
  }

  return createSight(ctx, {
    organizationId: run.organizationId,
    personId: executionPrincipalPersonId(run.principal),
  })
}
