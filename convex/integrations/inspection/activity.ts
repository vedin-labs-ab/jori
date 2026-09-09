import { v } from "convex/values"
import { internalQuery } from "../../_generated/server"
import { type Actor, getActorExternalId } from "../../shared/actor"
import {
  readDataNumber,
  readDataObject,
  readDataString,
} from "../../shared/data"

const connectionArgs = {
  integrationId: v.id("integrations"),
  cursor: v.optional(v.string()),
}

export const messages = internalQuery({
  args: connectionArgs,
  handler: async (ctx, args) => {
    const integration = await ctx.db.get(args.integrationId)
    if (integration === null) {
      return { page: [], isDone: true, continueCursor: "" }
    }
    const page = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q
          .eq("organizationId", integration.organizationId)
          .eq("integrationId", integration._id)
      )
      .paginate({ numItems: 25, cursor: args.cursor ?? null })
    return {
      ...page,
      page: page.page.map((row) => ({
        id: row._id,
        externalId: row.externalId,
        type: row.type,
        conversationId: row.conversationId,
        mentioned: row.mentioned,
        createdAt: row.createdAt,
        bot: publicBot(row.actor),
        references: references(row.data),
      })),
    }
  },
})

export const events = internalQuery({
  args: connectionArgs,
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("events")
      .withIndex("by_integration_and_key", (q) =>
        q.eq("integrationId", args.integrationId)
      )
      .paginate({ numItems: 25, cursor: args.cursor ?? null })
    return {
      ...page,
      page: page.page.map((row) => ({
        id: row._id,
        key: row.key,
        type: row.type,
        receivedAt: row._creationTime,
        bot: publicBot(row.actor),
        references: references(row.data),
      })),
    }
  },
})

export const runs = internalQuery({
  args: { organizationId: v.string(), cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("runs")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .order("desc")
      .paginate({ numItems: 25, cursor: args.cursor ?? null })
    return {
      ...page,
      page: page.page.map((row) => ({
        id: row._id,
        status: row.status,
        createdAt: row.createdAt,
        endedAt: row.endedAt,
        surface: row.snapshot.source.surface,
        causeType: row.cause.type,
        messageId:
          row.cause.type === "message" ? row.cause.messageId : undefined,
        eventId: row.cause.type === "event" ? row.cause.eventId : undefined,
      })),
    }
  },
})

export const actions = internalQuery({
  args: { runId: v.id("runs"), cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("traces")
      .withIndex("by_run_and_timestamp", (q) => q.eq("runId", args.runId))
      .order("desc")
      .paginate({ numItems: 10, cursor: args.cursor ?? null })
    return {
      ...page,
      page: page.page.map((row) => ({
        id: row._id,
        type: row.type,
        timestamp: row.timestamp,
        tool:
          "data" in row && "tool" in row.data ? row.data.tool.name : undefined,
      })),
    }
  },
})

function publicBot(actor: Actor | undefined) {
  return actor?.kind === "bot" || actor?.kind === "self"
    ? {
        id: getActorExternalId(actor),
        name: "name" in actor ? actor.name : undefined,
      }
    : undefined
}

function references(data: unknown) {
  return {
    repository: readDataString(readDataObject(data, "repository"), "fullName"),
    issueNumber: readDataNumber(data, "issueNumber"),
    pullNumber: readDataNumber(data, "pullNumber"),
    channelId: readDataString(readDataObject(data, "channel"), "id"),
    threadTs: readDataString(readDataObject(data, "thread"), "ts"),
    issueId: readDataString(data, "issueId"),
    pageId: readDataString(data, "pageId"),
    entityId: readDataString(readDataObject(data, "entity"), "id"),
  }
}
