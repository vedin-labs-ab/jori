import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { insertRow } from "../retention/write"
import { type Audience } from "../shared/audience"
import { findConversation } from "./resolve"

export async function ensureConversation(
  ctx: MutationCtx,
  args: {
    externalId: string
    integration: Doc<"integrations">
    message: Doc<"messages">
    scope: Audience
  }
) {
  const conversation = await findConversation(ctx, {
    organizationId: args.integration.organizationId,
    integrationId: args.integration._id,
    externalId: args.externalId,
  })

  if (conversation !== null) {
    return conversation
  }

  return await insertConversation(ctx, {
    externalId: args.externalId,
    integration: args.integration,
    message: args.message,
    scope: args.scope,
  })
}

export async function insertConversation(
  ctx: MutationCtx,
  args: {
    externalId: string
    integration: Doc<"integrations">
    message: Doc<"messages">
    scope: Audience
  }
) {
  return await insertRow(ctx, "conversations", {
    organizationId: args.integration.organizationId,
    surface: args.message.surface,
    integrationId: args.integration._id,
    externalId: args.externalId,
    scope: args.scope,
  })
}
