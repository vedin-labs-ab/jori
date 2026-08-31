import { type Doc, type Id } from "../_generated/dataModel"
import { type Audience } from "../shared/audience"

export type ConversationAudience = {
  conversationId: Id<"conversations">
  audience: Audience
}

export function conversationAudience(
  conversation: Doc<"conversations">
): ConversationAudience {
  return {
    conversationId: conversation._id,
    audience: conversation.scope,
  }
}

// The one inclusion gate for recent-activity context: organization-wide
// conversations are always shareable; anything narrower may only surface in a
// run that is scoped to the very person being contextualized.
export function canIncludeRecentConversation(args: {
  candidateAudience: Audience
  currentAudience: Audience | undefined
  personal: boolean
}) {
  return (
    args.candidateAudience === "organization" ||
    (args.currentAudience === "person" && args.personal)
  )
}
