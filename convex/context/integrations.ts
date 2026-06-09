import { v } from "convex/values"
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
import {
  getMicrosoftConnectedUser,
  getMicrosoftTenantName,
} from "../providers/microsoft/data"
import { getSlackTeamName } from "../providers/slack/data"

export const getSlackStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      return null
    }

    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_tenant_provider", (query) =>
        query.eq("tenantId", args.tenantId).eq("provider", "slack")
      )
      .order("desc")
      .first()

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
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      return null
    }

    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_tenant_provider", (query) =>
        query.eq("tenantId", args.tenantId).eq("provider", "linear")
      )
      .order("desc")
      .first()

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

export const getMicrosoftStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      return null
    }

    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_tenant_provider", (query) =>
        query.eq("tenantId", args.tenantId).eq("provider", "microsoft")
      )
      .order("desc")
      .first()

    if (integration === null) {
      return null
    }

    return {
      accountId: integration.accountId,
      status: integration.status,
      createdAt: integration.createdAt,
      tenantName: getMicrosoftTenantName(integration.data),
      connectedUser: getMicrosoftConnectedUser(integration.data),
    }
  },
})

export const getGitHubStatus = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity === null) {
      return null
    }

    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_tenant_provider", (query) =>
        query.eq("tenantId", args.tenantId).eq("provider", "github")
      )
      .order("desc")
      .first()

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
  const identity = await ctx.auth.getUserIdentity()

  if (identity === null) {
    return null
  }

  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_tenant_provider_owner", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("provider", args.provider)
        .eq("ownerId", identity.tokenIdentifier)
    )
    .order("desc")
    .first()

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
