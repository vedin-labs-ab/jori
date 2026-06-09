import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalMutation, type MutationCtx } from "../_generated/server"
import {
  findConversationActivation,
  startMessageExecution,
} from "../attention/activations"
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

const observedMessageArgs = {
  accountId: v.string(),
  type: v.string(),
  externalId: v.string(),
  actorId: v.optional(v.string()),
  actorEmail: v.optional(v.string()),
  conversationId: v.optional(v.string()),
  text: v.optional(v.string()),
  observedAt: v.optional(v.number()),
  data: v.optional(v.any()),
}

type ObservedMessage = {
  type: string
  externalId: string
  actorId?: string
  actorEmail?: string
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

    if (isSlackBotMessage(args.actorId, integration.data)) {
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

    if (isLinearAppMessage(args.actorId, integration.data)) {
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

  return await startMessageExecution(ctx, {
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
  args: { provider: string; accountId: string }
) {
  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_provider_account", (query) =>
      query.eq("provider", args.provider).eq("accountId", args.accountId)
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
    actorId: input.message.actorId,
    actorEmail: input.message.actorEmail,
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
  const actorEmail = normalizeEmail(input.message.actorEmail)

  if (actorEmail === undefined) {
    return undefined
  }

  const integrations = await ctx.db
    .query("integrations")
    .withIndex("by_tenant_status", (query) =>
      query.eq("tenantId", input.tenantId).eq("status", "active")
    )
    .collect()
  const ownerIds = new Set(
    integrations
      .filter(
        (integration) =>
          integration.scope === "user" &&
          integration.ownerId !== undefined &&
          isUserContextProvider(integration.provider) &&
          normalizeEmail(integration.accountId) === actorEmail
      )
      .map((integration) => integration.ownerId as string)
  )

  if (ownerIds.size !== 1) {
    return undefined
  }

  return [...ownerIds][0]
}

function isUserContextProvider(provider: string) {
  return (
    provider === "gmail" ||
    provider === "googleCalendar" ||
    provider === "microsoftEmail" ||
    provider === "microsoftCalendar"
  )
}

function normalizeEmail(email: string | undefined) {
  const normalized = email?.trim().toLowerCase()

  return normalized === "" ? undefined : normalized
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
