import { type Doc, type Id } from "../_generated/dataModel"
import { type AudienceScope } from "../shared/audience"

export type ConversationAudience = {
  conversationId: Id<"conversations">
  scope: AudienceScope
}

export function conversationAudience(
  conversation: Doc<"conversations">
): ConversationAudience {
  return {
    conversationId: conversation._id,
    scope: conversation.scope,
  }
}

// The one inclusion gate for recent-activity context: organization-wide
// conversations are always shareable; anything narrower may only surface in a
// run that is scoped to the very person being contextualized.
export function canIncludeRecentConversation(args: {
  candidateScope: AudienceScope
  currentScope: AudienceScope | undefined
  personal: boolean
}) {
  return (
    args.candidateScope === "organization" ||
    (args.currentScope === "person" && args.personal)
  )
}
