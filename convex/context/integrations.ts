import { v } from "convex/values"
import { type QueryCtx, query } from "../_generated/server"
import { getClerkUserId } from "../identity/users"
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
import { getSlackTeamName } from "../providers/slack/data"

export const getSlackStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const integration = await getTenantIntegration(ctx, {
      provider: "slack",
      tenantId: args.tenantId,
    })

    if (integration === null) {
      return null
    }

    return {
      accountId: integration.accountId,
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

    if (integration === null) {
      return null
    }

    return {
      accountId: integration.accountId,
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

    if (integration === null) {
      return null
    }

    return {
      accountId: integration.accountId,
      status: integration.status,
      createdAt: integration.createdAt,
      accountLogin: getGitHubAccountLogin(integration.data),
      accountType: getGitHubAccountType(integration.data),
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

  if (integration === null) {
    return null
  }

  return {
    accountId: integration.accountId,
    status: integration.status,
    createdAt: integration.createdAt,
    email: getGoogleEmail(integration.data),
    name: getGoogleName(integration.data),
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

  if (integration === null) {
    return null
  }

  return {
    accountId: integration.accountId,
    status: integration.status,
    createdAt: integration.createdAt,
    email: getMicrosoftEmail(integration.data),
    name: getMicrosoftConnectedUser(integration.data),
    tenantName: getMicrosoftTenantName(integration.data),
    scope: "user" as const,
  }
}

async function getTenantIntegration(
  ctx: QueryCtx,
  args: {
    provider: string
    tenantId: string
  }
) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    return null
  }

  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_provider", (query) =>
      query.eq("tenantId", args.tenantId).eq("provider", args.provider)
    )
    .order("desc")
    .first()
}

async function getUserIntegration(
  ctx: QueryCtx,
  args: {
    provider: GoogleSurfaceProvider | MicrosoftSurfaceProvider
    tenantId: string
  }
) {
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    return null
  }

  const userId = getClerkUserId(identity)

  if (userId === undefined) {
    return null
  }

  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_provider_owner", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("provider", args.provider)
        .eq("ownerId", userId)
    )
    .order("desc")
    .first()
}
