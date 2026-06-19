import { type Doc } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import { findConversation, startMessageRun } from "../conversations/data"
import {
  isGitHubAppMessage,
  isMiloRelevantGitHubMessage,
} from "../providers/github/gate"
import {
  isLinearAppMessage,
  isMiloRelevantLinearMessage,
} from "../providers/linear/gate"
import { getActorExternalId } from "../shared/actor"
import {
  findActiveIntegration,
  findMessageByExternalId,
  insertMessage,
  type ObservedMessage,
  observedMessageArgs,
  resolveMessageOwner,
} from "./data"
import { recordAutomationEvent } from "./events"

export const recordLinearMessage = internalMutation({
  args: observedMessageArgs,
  handler: async (ctx, args) => {
    const integration = await findActiveIntegration(ctx, {
      integration: "linear",
      accountId: args.accountId,
    })

    if (integration === null) {
      return { status: "missing_integration" as const }
    }

    if (
      isLinearAppMessage(
        getActorExternalId(args.actor, "linear"),
        integration.data
      )
    ) {
      return { status: "ignored_bot" as const }
    }

    return await recordProviderMessage(ctx, {
      integration,
      message: args,
      isRelevant: isMiloRelevantLinearMessage(args.text, args.type),
    })
  },
})

export const recordGitHubMessage = internalMutation({
  args: observedMessageArgs,
  handler: async (ctx, args) => {
    const integration = await findActiveIntegration(ctx, {
      integration: "github",
      accountId: args.accountId,
    })

    if (integration === null) {
      return { status: "missing_integration" as const }
    }

    if (isGitHubAppMessage(getGitHubSenderType(args.data))) {
      return { status: "ignored_bot" as const }
    }

    return await recordProviderMessage(ctx, {
      integration,
      message: args,
      isRelevant: isMiloRelevantGitHubMessage(args.text, args.type),
    })
  },
})

async function recordProviderMessage(
  ctx: MutationCtx,
  input: {
    integration: Doc<"integrations">
    message: ObservedMessage
    isRelevant: boolean
  }
) {
  const existingMessage = await findMessageByExternalId(
    ctx,
    input.message.externalId
  )

  if (existingMessage !== null) {
    return { status: "duplicate" as const }
  }

  const message = await insertMessage(ctx, {
    message: input.message,
    integration: input.integration,
  })
  const messageId = message._id
  const now = Date.now()
  await recordAutomationEvent(ctx, { ...input, now })
  const createdBy = await resolveMessageOwner(ctx, {
    tenantId: input.integration.tenantId,
    message: input.message,
  })

  const conversation = await findConversation(ctx, {
    tenantId: input.integration.tenantId,
    integrationId: input.integration._id,
    conversationId: input.message.conversationId,
  })

  if (conversation === null && !input.isRelevant) {
    return { status: "ignored" as const, messageId }
  }

  const messageText = normalizeMessageText(input.message.text)

  if (messageText === undefined) {
    return { status: "ignored_empty" as const, messageId }
  }

  return await startMessageRun(ctx, {
    conversation,
    integration: input.integration,
    message,
    conversationKey: input.message.conversationId ?? input.message.externalId,
    createdBy,
    now,
  })
}

function getGitHubSenderType(data: unknown) {
  if (typeof data !== "object" || data === null) {
    return undefined
  }

  const sender = (data as Record<string, unknown>).sender

  if (typeof sender !== "object" || sender === null) {
    return undefined
  }

  const type = (sender as Record<string, unknown>).type

  return typeof type === "string" ? type : undefined
}

function normalizeMessageText(text: string | undefined) {
  const value = text?.trim()

  return value === "" ? undefined : value
}
