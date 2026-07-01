import { type Doc, type Id } from "../_generated/dataModel"
import { isUserScopedIntegration } from "../shared/integrations"

export type RunScope = NonNullable<Doc<"runs">["scope"]>

export type ConversationAudience = {
  conversationId: Id<"conversations">
  scope: RunScope
}

export function conversationAudience(args: {
  conversation: Doc<"conversations">
  integration: Doc<"integrations">
}): ConversationAudience {
  return {
    conversationId: args.conversation._id,
    scope: conversationAudienceScope(args),
  }
}

export function conversationAudienceScope(args: {
  conversation: Doc<"conversations">
  integration: Doc<"integrations">
}): RunScope {
  if (args.conversation.visibility === "public") {
    return "tenant"
  }

  return isUserScopedIntegration(args.integration.integration)
    ? "person"
    : "conversation"
}

export function canIncludeRecentConversation(args: {
  candidateScope: RunScope
  currentScope: RunScope | undefined
}) {
  return args.candidateScope === "tenant" || args.currentScope === "person"
}
