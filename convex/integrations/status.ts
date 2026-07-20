import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { query } from "../_generated/server"
import { getOrganizationIntegration, getUserIntegration } from "./data"
import { getMicrosoftTenantName } from "./microsoft/data"
import { getNotionBotId } from "./notion/data"

export const getSlackStatus = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getOrganizationIntegration(ctx, {
      integration: "slack",
      organizationId: args.organizationId,
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
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getOrganizationIntegration(ctx, {
      integration: "linear",
      organizationId: args.organizationId,
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
    organizationId: v.string(),
  },
  handler: async (ctx, args) =>
    formatMicrosoftUserStatus(
      await getUserIntegration(ctx, {
        integration: "microsoftEmail",
        organizationId: args.organizationId,
      })
    ),
})

export const getMicrosoftCalendarStatus = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) =>
    formatMicrosoftUserStatus(
      await getUserIntegration(ctx, {
        integration: "microsoftCalendar",
        organizationId: args.organizationId,
      })
    ),
})

export const getGitHubStatus = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getOrganizationIntegration(ctx, {
      integration: "github",
      organizationId: args.organizationId,
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
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getOrganizationIntegration(ctx, {
      integration: "notion",
      organizationId: args.organizationId,
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
    organizationId: v.string(),
  },
  handler: async (ctx, args) =>
    formatGoogleUserStatus(
      await getUserIntegration(ctx, {
        integration: "gmail",
        organizationId: args.organizationId,
      })
    ),
})

export const getGoogleCalendarStatus = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) =>
    formatGoogleUserStatus(
      await getUserIntegration(ctx, {
        integration: "googleCalendar",
        organizationId: args.organizationId,
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
