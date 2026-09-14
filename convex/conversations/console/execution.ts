import { nameMentions } from "../../../contracts/replies/tokens"
import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import {
  type ResolvedContext,
  resolveConsoleContext,
  resolveConsoleReferences,
} from "../../messages/references"
import { createConversationSight } from "../access"

/** The folder when this message was sent, visible to the chat's current
 * audience, and its text with mentions named for the run title. */
export async function consoleRunDetails(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  message: Doc<"messages">
): Promise<{ context: ResolvedContext | undefined; title?: string }> {
  if (conversation.surface !== "console") {
    return { context: undefined }
  }

  const sight = createConversationSight(ctx, conversation)
  const references = await resolveConsoleReferences(ctx, sight, message.data)

  return {
    context: await resolveConsoleContext(ctx, sight, message.data),
    ...(references.length === 0
      ? {}
      : { title: nameMentions(message.text ?? "", references) }),
  }
}
