import { v } from "convex/values"
import { type Doc, type Id } from "../../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../../_generated/server"
import { readDataString } from "../../shared/data"
import { requireRegion } from "../../shared/origin"

const pageArgs = {
  integrationId: v.id("integrations"),
  cursor: v.optional(v.string()),
}

// These queries project fields explicitly. Never return job instructions,
// card arguments, summaries, identities' profiles or integration credentials.
export const jobs = internalQuery({
  args: {
    ...pageArgs,
    botUserId: v.optional(v.string()),
    channelIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const integration = await slackConnection(ctx, args.integrationId)
    const botUserId = checkedBotId(args.botUserId ?? integration.botUserId)
    const channelIds = checkedChannels(args.channelIds ?? [])
    const page = await ctx.db
      .query("jobs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", integration.organizationId)
      )
      .paginate({ numItems: 25, cursor: args.cursor ?? null })
    return {
      integration,
      ...page,
      page: page.page.map((row) => ({
        id: row._id,
        status: row.status,
        type: row.type,
        parentId: row.parent?.id,
        hasSlackAccess: row.access.integrations.some(
          (access) => access.id === integration.id && access.tools.length > 0
        ),
        triggeredBySlack:
          "integrationId" in row.trigger &&
          row.trigger.integrationId === integration.id,
        nextAt:
          "nextAt" in row.trigger
            ? row.trigger.nextAt
            : "at" in row.trigger
              ? row.trigger.at
              : undefined,
        referencesBot:
          botUserId !== undefined && row.instructions.includes(botUserId),
        // Only echo validated IDs supplied by the operator, never extract
        // arbitrary strings from customer instructions or trigger values.
        referencedChannelIds: channelIds.filter((id) =>
          row.instructions.includes(id)
        ),
        triggerChannelIds: channelIds.filter(
          (id) =>
            "match" in row.trigger &&
            Object.values(row.trigger.match ?? {}).includes(id)
        ),
      })),
    }
  },
})

export const approvals = internalQuery({
  args: pageArgs,
  handler: async (ctx, args) => {
    const integration = await slackConnection(ctx, args.integrationId)
    const page = await ctx.db
      .query("approvals")
      .withIndex("by_organization_and_expires_at", (q) =>
        q.eq("organizationId", integration.organizationId)
      )
      .paginate({ numItems: 25, cursor: args.cursor ?? null })
    return {
      integration,
      ...page,
      page: page.page.flatMap((row) =>
        row.delivery === undefined ||
        row.delivery.integrationId === integration.id
          ? [
              {
                id: row._id,
                runId: row.runId,
                status: row.status,
                expiresAt: row.expiresAt,
                pending: row.status === "pending" && row.expiresAt > Date.now(),
                delivery:
                  row.delivery === undefined
                    ? undefined
                    : cardTarget(row.delivery),
              },
            ]
          : []
      ),
    }
  },
})

export const offers = internalQuery({
  args: pageArgs,
  handler: async (ctx, args) => {
    const integration = await slackConnection(ctx, args.integrationId)
    const page = await ctx.db
      .query("integrationOffers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", integration.organizationId)
      )
      .paginate({ numItems: 25, cursor: args.cursor ?? null })
    return {
      integration,
      ...page,
      page: page.page.flatMap((row) =>
        row.delivery?.integrationId === integration.id ||
        row.source.integrationId === integration.id
          ? [
              {
                id: row._id,
                runId: row.runId,
                status: row.status,
                expiresAt: row.expiresAt,
                pending:
                  (row.status === "pending" || row.status === "claimed") &&
                  row.expiresAt > Date.now(),
                sourceIntegrationId: row.source.integrationId,
                delivery:
                  row.delivery?.integrationId === integration.id
                    ? cardTarget(row.delivery)
                    : undefined,
              },
            ]
          : []
      ),
    }
  },
})

export const subscriptions = internalQuery({
  args: {
    ...pageArgs,
    botUserId: v.optional(v.string()),
    channelIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const integration = await slackConnection(ctx, args.integrationId)
    const botUserId = checkedBotId(args.botUserId ?? integration.botUserId)
    const channelIds = checkedChannels(args.channelIds ?? [])
    const page = await ctx.db
      .query("subscriptions")
      .withIndex("by_integration_event_match", (q) =>
        q.eq("integrationId", integration.id)
      )
      .paginate({ numItems: 25, cursor: args.cursor ?? null })
    return {
      integration,
      ...page,
      page: page.page.map((row) => ({
        id: row._id,
        status: row.status,
        event: row.event,
        expiresAt: row.expiresAt,
        referencesBot:
          botUserId !== undefined &&
          Object.values(row.match ?? {}).includes(botUserId),
        referencedChannelIds: channelIds.filter((id) =>
          Object.values(row.match ?? {}).includes(id)
        ),
      })),
    }
  },
})

export const identity = internalQuery({
  args: { ...pageArgs, botUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const integration = await slackConnection(ctx, args.integrationId)
    const botUserId = checkedBotId(args.botUserId ?? integration.botUserId)
    if (botUserId === undefined) {
      return { integration, page: [], isDone: true, continueCursor: "" }
    }
    const page = await ctx.db
      .query("identities")
      .withIndex("by_organization_provider_external_id", (q) =>
        q
          .eq("organizationId", integration.organizationId)
          .eq("provider", "slack")
          .eq("externalId", botUserId)
      )
      .paginate({ numItems: 25, cursor: args.cursor ?? null })
    return {
      integration,
      ...page,
      page: page.page.map((row) => ({
        id: row._id,
        personId: row.personId,
        externalId: row.externalId,
        linkedBy: row.link.method,
        hasCachedName: row.name !== undefined,
        hasCachedEmail: row.email !== undefined,
      })),
    }
  },
})

async function slackConnection(ctx: QueryCtx, id: Id<"integrations">) {
  const row = await ctx.db.get(id)
  if (row?.integration !== "slack") {
    throw new Error("Slack integration not found")
  }
  return {
    id: row._id,
    organizationId: row.organizationId,
    region: requireRegion(),
    status: row.status,
    appId: readDataString(row.data, "appId"),
    botUserId: readDataString(row.data, "botUserId"),
    connectionGeneration: row.connectionGeneration ?? 0,
  }
}

function cardTarget(delivery: NonNullable<Doc<"approvals">["delivery"]>) {
  return {
    integrationId: delivery.integrationId,
    channelId: delivery.data.channelId,
    isDirectMessage: delivery.data.channelId.startsWith("D"),
    messageTs: delivery.data.messageTs,
    threadTs: delivery.data.threadTs,
    // Historical deliveries do not store their author app/bot IDs. Current
    // integration identity must not be presented as proven card authorship.
    authorIdentityRecorded: false,
  }
}

function checkedBotId(value: string | undefined) {
  if (value !== undefined && !/^U[A-Z0-9]{8,20}$/.test(value)) {
    throw new Error("Expected a Slack bot user ID")
  }
  return value
}

function checkedChannels(values: string[]) {
  if (
    values.length > 25 ||
    values.some((value) => !/^[CDG][A-Z0-9]{8,20}$/.test(value))
  ) {
    throw new Error("Expected at most 25 Slack channel IDs")
  }
  return [...new Set(values)]
}
