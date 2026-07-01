import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { isUserScopedIntegration } from "../../shared/integrations"

export type RunAudience = {
  audienceScope: NonNullable<Doc<"runs">["audienceScope"]>
  conversationId?: Id<"conversations">
}

type RunAudienceInput = {
  createdBy?: Id<"persons">
  parentId?: Id<"runs">
}

type ConversationOrigin = {
  conversation: Doc<"conversations">
  integration: Doc<"integrations">
}

type RunOrigin = {
  automation?: Doc<"automations">
  conversation?: ConversationOrigin
}

export async function resolveRunAudience(
  ctx: MutationCtx,
  args: {
    origin?: RunOrigin
    run: RunAudienceInput
  }
): Promise<RunAudience> {
  const parentAudience = await resolveParentAudience(ctx, args.run.parentId)

  if (parentAudience !== null) {
    return parentAudience
  }

  if (args.origin?.conversation !== undefined) {
    return conversationAudience(args.origin.conversation)
  }

  if (args.origin?.automation !== undefined) {
    return automationAudience(args.origin.automation)
  }

  return { audienceScope: "person" }
}

async function resolveParentAudience(
  ctx: MutationCtx,
  parentId: Id<"runs"> | undefined
): Promise<RunAudience | null> {
  if (parentId === undefined) {
    return null
  }

  const parent = await ctx.db.get(parentId)

  if (parent === null) {
    throw new Error("Parent run not found.")
  }

  return {
    audienceScope: parent.audienceScope ?? "person",
    conversationId: parent.conversationId,
  }
}

function conversationAudience(origin: ConversationOrigin): RunAudience {
  const conversationId = origin.conversation._id

  if (origin.conversation.visibility === "public") {
    return { audienceScope: "tenant", conversationId }
  }

  if (isUserScopedIntegration(origin.integration.integration)) {
    return { audienceScope: "person", conversationId }
  }

  return { audienceScope: "conversation", conversationId }
}

function automationAudience(automation: Doc<"automations">): RunAudience {
  return (automation.visibility ?? "private") === "public"
    ? { audienceScope: "tenant" }
    : { audienceScope: "person" }
}
