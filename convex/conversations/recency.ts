import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import {
  recencyConversationLimit,
  recencyMessageLimit,
  recencyWindowMs,
} from "./limits"
import { findMessageConversation } from "./resolve"
import {
  canIncludeRecentConversation,
  conversationAudienceScope,
} from "./scope"

export type RecentActivity = {
  ageMs: number
  conversationId: Id<"conversations">
  integration: Doc<"messages">["integration"]
  summarizedAt: number
  summary: string
}

type IntegrationCache = Map<Id<"integrations">, Doc<"integrations"> | null>

export async function loadRecentActivity(
  ctx: QueryCtx,
  args: {
    message: Doc<"messages">
    now: number
    run: Doc<"runs">
  }
): Promise<RecentActivity[]> {
  const personId = args.message.personId ?? args.run.createdBy

  if (personId === undefined) {
    return []
  }

  const currentConversationId = await resolveCurrentConversationId(ctx, args)
  const messages = await recentPersonMessages(ctx, {
    now: args.now,
    personId,
    tenantId: args.run.tenantId,
  })

  return await collectRecentActivity(ctx, {
    currentConversationId,
    currentScope: args.run.scope,
    messages,
    now: args.now,
    tenantId: args.run.tenantId,
  })
}

async function collectRecentActivity(
  ctx: QueryCtx,
  args: {
    currentConversationId: Id<"conversations"> | undefined
    currentScope: Doc<"runs">["scope"]
    messages: Doc<"messages">[]
    now: number
    tenantId: string
  }
) {
  const integrations: IntegrationCache = new Map()
  const seen = new Set<Id<"conversations">>()
  const activity: RecentActivity[] = []

  for (const message of args.messages) {
    const entry = await recentActivityForMessage(ctx, message, {
      currentConversationId: args.currentConversationId,
      currentScope: args.currentScope,
      integrations,
      now: args.now,
      seen,
      tenantId: args.tenantId,
    })

    if (entry !== null) {
      activity.push(entry)
    }

    if (activity.length >= recencyConversationLimit) {
      return activity
    }
  }

  return activity
}

async function recentActivityForMessage(
  ctx: QueryCtx,
  message: Doc<"messages">,
  options: {
    currentConversationId: Id<"conversations"> | undefined
    currentScope: Doc<"runs">["scope"]
    integrations: IntegrationCache
    now: number
    seen: Set<Id<"conversations">>
    tenantId: string
  }
): Promise<RecentActivity | null> {
  const conversation = await findMessageConversation(ctx, message)

  if (!isCandidateConversation(conversation, options)) {
    return null
  }

  const integration = await cachedIntegration(
    ctx,
    options.integrations,
    conversation.integrationId
  )

  if (integration === null || integration.tenantId !== options.tenantId) {
    return null
  }

  const candidateScope = conversationAudienceScope({
    conversation,
    integration,
  })

  if (
    !canIncludeRecentConversation({
      candidateScope,
      currentScope: options.currentScope,
    })
  ) {
    return null
  }

  options.seen.add(conversation._id)

  return {
    ageMs: Math.max(0, options.now - conversation.summarizedAt),
    conversationId: conversation._id,
    integration: message.integration,
    summarizedAt: conversation.summarizedAt,
    summary: conversation.summary,
  }
}

function isCandidateConversation(
  conversation: Doc<"conversations"> | null,
  options: {
    currentConversationId: Id<"conversations"> | undefined
    seen: Set<Id<"conversations">>
    tenantId: string
  }
): conversation is Doc<"conversations"> & {
  summarizedAt: number
  summary: string
} {
  return (
    conversation !== null &&
    conversation.tenantId === options.tenantId &&
    conversation._id !== options.currentConversationId &&
    !options.seen.has(conversation._id) &&
    conversation.summary !== undefined &&
    conversation.summary.trim() !== "" &&
    conversation.summarizedAt !== undefined
  )
}

async function recentPersonMessages(
  ctx: QueryCtx,
  args: {
    now: number
    personId: Id<"persons">
    tenantId: string
  }
) {
  return await ctx.db
    .query("messages")
    .withIndex("by_tenant_and_person_and_created_at", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("personId", args.personId)
        .gte("createdAt", args.now - recencyWindowMs)
    )
    .order("desc")
    .take(recencyMessageLimit)
}

async function resolveCurrentConversationId(
  ctx: QueryCtx,
  args: {
    message: Doc<"messages">
    run: Doc<"runs">
  }
) {
  if (args.run.conversationId !== undefined) {
    return args.run.conversationId
  }

  return (await findMessageConversation(ctx, args.message))?._id
}

async function cachedIntegration(
  ctx: QueryCtx,
  cache: IntegrationCache,
  integrationId: Id<"integrations">
) {
  if (!cache.has(integrationId)) {
    cache.set(integrationId, await ctx.db.get(integrationId))
  }

  return cache.get(integrationId) ?? null
}
