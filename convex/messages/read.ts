import { type Doc } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"

/** Scope chronological reads to one conversation. Callers own access checks,
 * ordering, and how many messages to read. */
export function conversationMessages(
  ctx: QueryLikeCtx,
  conversation: Pick<
    Doc<"conversations">,
    "organizationId" | "integrationId" | "externalId"
  >,
  range?: { type: "after" | "before"; createdAt: number }
) {
  return ctx.db
    .query("messages")
    .withIndex(
      "by_organization_and_integration_and_conversation_and_created_at",
      (q) => {
        const scoped = q
          .eq("organizationId", conversation.organizationId)
          .eq("integrationId", conversation.integrationId)
          .eq("conversationId", conversation.externalId)

        if (range?.type === "after") {
          return scoped.gt("createdAt", range.createdAt)
        }
        if (range?.type === "before") {
          return scoped.lt("createdAt", range.createdAt)
        }
        return scoped
      }
    )
}
