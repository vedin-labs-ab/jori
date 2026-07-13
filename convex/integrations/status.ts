import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { query } from "../_generated/server"
import { getTenantIntegration, getUserIntegration } from "./data"
import { getMicrosoftTenantName } from "./microsoft/data"
import { getNotionBotId } from "./notion/data"

export const getSlackStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getTenantIntegration(ctx, {
      integration: "slack",
      tenantId: args.tenantId,
    })

    if (integration === null) {
      return null
    }

    return {
      externalId: integration.externalId,
      name: integration.name,
      status: integration.status,
      createdAt: integration.createdAt,
    }
  },
})

export const getLinearStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getTenantIntegration(ctx, {
      integration: "linear",
      tenantId: args.tenantId,
    })

    if (integration === null) {
      return null
    }

    return {
      externalId: integration.externalId,
      name: integration.name,
      url: integration.url,
      status: integration.status,
      createdAt: integration.createdAt,
    }
  },
})

export const getMicrosoftEmailStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) =>
    formatMicrosoftUserStatus(
      await getUserIntegration(ctx, {
        integration: "microsoftEmail",
        tenantId: args.tenantId,
      })
    ),
})

export const getMicrosoftCalendarStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) =>
    formatMicrosoftUserStatus(
      await getUserIntegration(ctx, {
        integration: "microsoftCalendar",
        tenantId: args.tenantId,
      })
    ),
})

export const getGitHubStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getTenantIntegration(ctx, {
      integration: "github",
      tenantId: args.tenantId,
    })

    if (integration === null) {
      return null
    }

    return {
      externalId: integration.externalId,
      name: integration.name,
      url: integration.url,
      avatar: integration.avatar,
      status: integration.status,
      createdAt: integration.createdAt,
    }
  },
})

export const getNotionStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getTenantIntegration(ctx, {
      integration: "notion",
      tenantId: args.tenantId,
    })

    if (integration === null) {
      return null
    }

    return {
      externalId: integration.externalId,
      name: integration.name,
      avatar: integration.avatar,
      status: integration.status,
      createdAt: integration.createdAt,
      botId: getNotionBotId(integration.data),
    }
  },
})

export const getGmailStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) =>
    formatGoogleUserStatus(
      await getUserIntegration(ctx, {
        integration: "gmail",
        tenantId: args.tenantId,
      })
    ),
})

export const getGoogleCalendarStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) =>
    formatGoogleUserStatus(
      await getUserIntegration(ctx, {
        integration: "googleCalendar",
        tenantId: args.tenantId,
      })
    ),
})

function formatGoogleUserStatus(integration: Doc<"integrations"> | null) {
  if (integration === null) {
    return null
  }

  return {
    externalId: integration.externalId,
    email: integration.email,
    name: integration.name,
    avatar: integration.avatar,
    status: integration.status,
    createdAt: integration.createdAt,
    scope: "user" as const,
  }
}

function formatMicrosoftUserStatus(integration: Doc<"integrations"> | null) {
  if (integration === null) {
    return null
  }

  return {
    externalId: integration.externalId,
    email: integration.email,
    name: integration.name,
    status: integration.status,
    createdAt: integration.createdAt,
    tenantName: getMicrosoftTenantName(integration.data),
    scope: "user" as const,
  }
}
