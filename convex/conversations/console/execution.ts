import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { conversationMessages } from "../../messages/read"
import {
  type ResolvedContext,
  resolveConsoleContext,
  resolveConsoleReferences,
} from "../../messages/references"
import { nameMentions } from "../../references/tokens"
import { createConversationSight } from "../access"

/** What a console conversation was opened about, as its current audience
 *  can see it — the context rides on their first message, and
 *  the message's text with its mentions named, for the run's title.
 *  The chat's own folder determines attribution independently of context. */
export async function consoleRunDetails(
  ctx: MutationCtx,
  conversation: Doc<"conversations">,
  message: Doc<"messages">
): Promise<{ context: ResolvedContext | undefined; title?: string }> {
  if (conversation.surface !== "console") {
    return { context: undefined }
  }

  const first = await conversationMessages(ctx, {
    ...conversation,
    integrationId: undefined,
  })
    .order("asc")
    .first()
  const sight = createConversationSight(ctx, conversation)
  const references = await resolveConsoleReferences(ctx, sight, message.data)

  return {
    context: await resolveConsoleContext(ctx, sight, first?.data),
    ...(references.length === 0
      ? {}
      : { title: nameMentions(message.text ?? "", references) }),
  }
}
