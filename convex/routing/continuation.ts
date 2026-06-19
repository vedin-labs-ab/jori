import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import {
  continueTerminalConversationSession,
  findConversation,
} from "../conversations/data"

export async function continueTerminalSlackSession(
  ctx: MutationCtx,
  input: {
    integration: Doc<"integrations">
    message: Doc<"messages">
    now: number
    route: "agent" | "ignore" | "reply"
  }
) {
  if (input.route === "agent" || input.message.conversationId === undefined) {
    return
  }

  const conversation = await findConversation(ctx, {
    tenantId: input.integration.tenantId,
    integrationId: input.integration._id,
    conversationId: input.message.conversationId,
  })

  if (conversation === null) {
    return
  }

  await continueTerminalConversationSession(ctx, {
    conversationId: conversation._id,
    now: input.now,
  })
}
