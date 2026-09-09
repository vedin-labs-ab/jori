import { v } from "convex/values"
import { internal } from "../../_generated/api"
import {
  type ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server"
import { readDataString } from "../../shared/data"
import { createGitHubInstallationToken, githubAppRequest } from "./app"
import { githubApiUrl } from "./config"

export const githubIdentity = v.object({
  appId: v.string(),
  appSlug: v.string(),
  botLogin: v.string(),
  botUserId: v.string(),
})

export async function fetchGitHubIdentity(installationId?: string) {
  const app = await githubAppRequest<{ id: number; slug: string }>("/app", {
    method: "GET",
  })
  const botLogin = `${app.slug}[bot]`
  const token =
    installationId === undefined
      ? undefined
      : await createGitHubInstallationToken(installationId)
  const response = await fetch(
    `${githubApiUrl}/users/${encodeURIComponent(botLogin)}`,
    {
      headers: {
        accept: "application/vnd.github+json",
        ...(token === undefined
          ? {}
          : { authorization: `Bearer ${token.token}` }),
      },
    }
  )
  if (!response.ok) {
    throw new Error(
      `GitHub bot profile request failed with status ${response.status}`
    )
  }
  const bot = (await response.json()) as {
    id?: number
    login?: string
    type?: string
  }
  if (
    typeof bot.id !== "number" ||
    bot.login !== botLogin ||
    bot.type !== "Bot"
  ) {
    throw new Error("GitHub bot profile did not match the registered app")
  }
  return {
    appId: String(app.id),
    appSlug: app.slug,
    botLogin,
    botUserId: String(bot.id),
  }
}

// Run in each regional deployment after changing its provider registration.
// Credentials and installation ownership stay in place, including expired rows.
export const refresh = internalAction({
  args: {},
  handler: async (ctx): Promise<{ appSlug: string; updated: number }> => {
    const identity = await fetchGitHubIdentity(await activeInstallationId(ctx))
    let cursor: string | null = null
    let updated = 0
    for (;;) {
      const page: { cursor: string | null; updated: number } =
        await ctx.runMutation(internal.integrations.github.identity.update, {
          identity,
          cursor,
        })
      updated += page.updated
      if (page.cursor === null) {
        return { appSlug: identity.appSlug, updated }
      }
      cursor = page.cursor
    }
  },
})

async function activeInstallationId(ctx: ActionCtx) {
  let cursor: string | null = null
  for (;;) {
    const page: { installationId: string | null; cursor: string | null } =
      await ctx.runQuery(internal.integrations.github.identity.installation, {
        cursor,
      })
    if (page.installationId !== null || page.cursor === null) {
      return page.installationId ?? undefined
    }
    cursor = page.cursor
  }
}

export const installation = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("integrations")
      .withIndex("by_integration_and_external", (q) =>
        q.eq("integration", "github")
      )
      .paginate({ numItems: 100, cursor: args.cursor })
    return {
      installationId:
        page.page.find((row) => row.status === "active")?.externalId ?? null,
      cursor: page.isDone ? null : page.continueCursor,
    }
  },
})

export const update = internalMutation({
  args: { identity: githubIdentity, cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("integrations")
      .withIndex("by_integration_and_external", (q) =>
        q.eq("integration", "github")
      )
      .paginate({ numItems: 100, cursor: args.cursor })
    for (const integration of page.page) {
      const appId = readDataString(integration.data, "appId")
      if (appId !== undefined && appId !== args.identity.appId) {
        throw new Error(
          "A GitHub connection belongs to a different app registration"
        )
      }
      await ctx.db.patch(integration._id, {
        data: { ...integration.data, ...args.identity },
        updatedAt: Date.now(),
      })
    }
    return {
      cursor: page.isDone ? null : page.continueCursor,
      updated: page.page.length,
    }
  },
})
