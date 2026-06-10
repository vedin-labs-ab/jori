import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { type QueryCtx, query } from "../_generated/server"
import {
  getGitHubAccountLogin,
  getGitHubAccountType,
} from "../providers/github/data"
import { type GoogleSurfaceProvider } from "../providers/google/config"
import { getGoogleEmail, getGoogleName } from "../providers/google/data"
import {
  getLinearOrganizationName,
  getLinearOrganizationUrlKey,
} from "../providers/linear/data"
import { type MicrosoftSurfaceProvider } from "../providers/microsoft/config"
import {
  getMicrosoftConnectedUser,
  getMicrosoftEmail,
  getMicrosoftTenantName,
} from "../providers/microsoft/data"
import {
  getNotionBotId,
  getNotionOwnerEmail,
  getNotionOwnerName,
  getNotionWorkspaceIcon,
  getNotionWorkspaceName,
} from "../providers/notion/data"
import { getSlackTeamName } from "../providers/slack/data"
import { getTenantIntegration, getUserIntegration } from "./data"

export const getSlackStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getTenantIntegration(ctx, {
      provider: "slack",
      tenantId: args.tenantId,
    })

    if (!isVisibleIntegration(integration)) {
      return null
    }

    return {
      externalId: integration.externalId,
      name: integration.name,
      status: integration.status,
      createdAt: integration.createdAt,
      teamName: getSlackTeamName(integration.data),
    }
  },
})

export const getLinearStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getTenantIntegration(ctx, {
      provider: "linear",
      tenantId: args.tenantId,
    })

    if (!isVisibleIntegration(integration)) {
      return null
    }

    return {
      externalId: integration.externalId,
      name: integration.name,
      status: integration.status,
      createdAt: integration.createdAt,
      organizationName: getLinearOrganizationName(integration.data),
      organizationUrlKey: getLinearOrganizationUrlKey(integration.data),
    }
  },
})

export const getMicrosoftEmailStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    return await getMicrosoftUserStatus(ctx, {
      provider: "microsoftEmail",
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
      provider: "microsoftCalendar",
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
      provider: "github",
      tenantId: args.tenantId,
    })

    if (!isVisibleIntegration(integration)) {
      return null
    }

    return {
      externalId: integration.externalId,
      name: integration.name,
      url: integration.url,
      avatar: integration.avatar,
      status: integration.status,
      createdAt: integration.createdAt,
      accountLogin: getGitHubAccountLogin(integration.data),
      accountType: getGitHubAccountType(integration.data),
    }
  },
})

export const getNotionStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getTenantIntegration(ctx, {
      provider: "notion",
      tenantId: args.tenantId,
    })

    if (!isVisibleIntegration(integration)) {
      return null
    }

    return {
      externalId: integration.externalId,
      name: integration.name,
      avatar: integration.avatar,
      status: integration.status,
      createdAt: integration.createdAt,
      botId: getNotionBotId(integration.data),
      ownerEmail: getNotionOwnerEmail(integration.data),
      ownerName: getNotionOwnerName(integration.data),
      workspaceIcon: getNotionWorkspaceIcon(integration.data),
      workspaceName: getNotionWorkspaceName(integration.data),
    }
  },
})

export const getGmailStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    return await getGoogleUserStatus(ctx, {
      provider: "gmail",
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
      provider: "googleCalendar",
      tenantId: args.tenantId,
    })
  },
})

async function getGoogleUserStatus(
  ctx: QueryCtx,
  args: {
    provider: GoogleSurfaceProvider
    tenantId: string
  }
) {
  const integration = await getUserIntegration(ctx, args)

  if (!isVisibleIntegration(integration)) {
    return null
  }

  return {
    externalId: integration.externalId,
    email: integration.email,
    name: integration.name,
    avatar: integration.avatar,
    status: integration.status,
    createdAt: integration.createdAt,
    fallbackEmail: getGoogleEmail(integration.data),
    fallbackName: getGoogleName(integration.data),
    scope: "user" as const,
  }
}

async function getMicrosoftUserStatus(
  ctx: QueryCtx,
  args: {
    provider: MicrosoftSurfaceProvider
    tenantId: string
  }
) {
  const integration = await getUserIntegration(ctx, args)

  if (!isVisibleIntegration(integration)) {
    return null
  }

  return {
    externalId: integration.externalId,
    email: integration.email,
    name: integration.name,
    status: integration.status,
    createdAt: integration.createdAt,
    fallbackEmail: getMicrosoftEmail(integration.data),
    fallbackName: getMicrosoftConnectedUser(integration.data),
    tenantName: getMicrosoftTenantName(integration.data),
    scope: "user" as const,
  }
}

function isVisibleIntegration(
  integration: Doc<"integrations"> | null
): integration is Doc<"integrations"> {
  return integration !== null
}
