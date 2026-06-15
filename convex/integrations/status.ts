import { v } from "convex/values"
import { type QueryCtx, query } from "../_generated/server"
import { type GoogleIntegration } from "../providers/google/config"
import { type MicrosoftIntegration } from "../providers/microsoft/config"
import { getMicrosoftTenantName } from "../providers/microsoft/data"
import { getNotionBotId } from "../providers/notion/data"
import { getTenantIntegration, getUserIntegration } from "./data"

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
  handler: async (ctx, args) => {
    return await getMicrosoftUserStatus(ctx, {
      integration: "microsoftEmail",
      tenantId: args.tenantId,
    })
  },
})

export const getMicrosoftCalendarStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    return await getMicrosoftUserStatus(ctx, {
      integration: "microsoftCalendar",
      tenantId: args.tenantId,
    })
  },
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
  handler: async (ctx, args) => {
    return await getGoogleUserStatus(ctx, {
      integration: "gmail",
      tenantId: args.tenantId,
    })
  },
})

export const getGoogleCalendarStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    return await getGoogleUserStatus(ctx, {
      integration: "googleCalendar",
      tenantId: args.tenantId,
    })
  },
})

export const getGoogleDriveStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getTenantIntegration(ctx, {
      integration: "googleDrive",
      tenantId: args.tenantId,
    })

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
      scope: "tenant" as const,
    }
  },
})

async function getGoogleUserStatus(
  ctx: QueryCtx,
  args: {
    integration: GoogleIntegration
    tenantId: string
  }
) {
  const integration = await getUserIntegration(ctx, args)

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

async function getMicrosoftUserStatus(
  ctx: QueryCtx,
  args: {
    integration: MicrosoftIntegration
    tenantId: string
  }
) {
  const integration = await getUserIntegration(ctx, args)

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
