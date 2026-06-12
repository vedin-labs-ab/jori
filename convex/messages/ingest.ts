import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import {
  findConversationActivation,
  startMessageRun,
} from "../attention/activations"
import { resolveUserIdByEmail } from "../identity/identities"
import { type IntegrationProvider } from "../providers/catalog"
import {
  isGitHubAppMessage,
  isMiloRelevantGitHubMessage,
} from "../providers/github/gate"
import {
  isLinearAppMessage,
  isMiloRelevantLinearMessage,
} from "../providers/linear/gate"
import { getSlackBotId } from "../providers/slack/data"
import { isMiloRelevantMessage } from "../providers/slack/gate"
import {
  type Actor,
  actorValidator,
  getActorEmail,
  getActorExternalId,
} from "../shared/actor"

const observedMessageArgs = {
  accountId: v.string(),
  type: v.string(),
  externalId: v.string(),
  actor: v.optional(actorValidator),
  conversationId: v.optional(v.string()),
  text: v.optional(v.string()),
  observedAt: v.optional(v.number()),
  data: v.optional(v.any()),
}

type ObservedMessage = {
  type: string
  externalId: string
  actor?: Actor
  conversationId?: string
  text?: string
  observedAt?: number
  data?: unknown
}

export const recordSlackMessage = internalMutation({
  args: observedMessageArgs,
  handler: async (ctx, args) => {
    const integration = await findActiveIntegration(ctx, {
      provider: "slack",
      accountId: args.accountId,
    })

    if (integration === null) {
      return { status: "missing_integration" as const }
    }

    if (
      isSlackBotMessage(
        getActorExternalId(args.actor, "slack"),
        integration.data
      )
    ) {
      return { status: "ignored_bot" as const }
    }

    return await recordProviderMessage(ctx, {
      integration,
      message: args,
      isRelevant: isMiloRelevantMessage(
        args.text,
        args.type,
        args.data,
        integration.data
      ),
    })
  },
})

export const recordLinearMessage = internalMutation({
  args: observedMessageArgs,
  handler: async (ctx, args) => {
    const integration = await findActiveIntegration(ctx, {
      provider: "linear",
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
      provider: "github",
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
  const existingMessage = await ctx.db
    .query("messages")
    .withIndex("by_external_id", (query) =>
      query.eq("externalId", input.message.externalId)
    )
    .first()

  if (existingMessage !== null) {
    return { status: "duplicate" as const }
  }

  const messageId = await insertMessage(ctx, {
    message: input.message,
    integration: input.integration,
  })
  const now = Date.now()
  const createdBy = await resolveMessageOwner(ctx, {
    tenantId: input.integration.tenantId,
    message: input.message,
  })

  const activation = await findConversationActivation(ctx, {
    tenantId: input.integration.tenantId,
    integrationId: input.integration._id,
    conversationId: input.message.conversationId,
  })

  if (activation === null && !input.isRelevant) {
    return { status: "ignored" as const, messageId }
  }

  return await startMessageRun(ctx, {
    activation,
    integration: input.integration,
    messageId,
    messageType: input.message.type,
    messageExternalId: input.message.externalId,
    conversationId: input.message.conversationId ?? input.message.externalId,
    createdBy,
    now,
  })
}

async function findActiveIntegration(
  ctx: MutationCtx,
  args: { provider: IntegrationProvider; accountId: string }
) {
  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_provider_and_external", (query) =>
      query.eq("provider", args.provider).eq("externalId", args.accountId)
    )
    .first()

  if (integration === null || integration.status !== "active") {
    return null
  }

  return integration
}

async function insertMessage(
  ctx: MutationCtx,
  input: {
    message: ObservedMessage
    integration: Doc<"integrations">
  }
): Promise<Id<"messages">> {
  return await ctx.db.insert("messages", {
    tenantId: input.integration.tenantId,
    integrationId: input.integration._id,
    type: input.message.type,
    externalId: input.message.externalId,
    actor: input.message.actor,
    conversationId: input.message.conversationId,
    text: input.message.text,
    data: input.message.data,
    observedAt: input.message.observedAt,
    createdAt: Date.now(),
  })
}

async function resolveMessageOwner(
  ctx: MutationCtx,
  input: {
    tenantId: string
    message: ObservedMessage
  }
) {
  return await resolveUserIdByEmail(ctx, {
    tenantId: input.tenantId,
    email: getActorEmail(input.message.actor),
  })
}

function isSlackBotMessage(actorId: string | undefined, data: unknown) {
  if (actorId === undefined) {
    return false
  }

  return actorId === getSlackBotId(data)
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
