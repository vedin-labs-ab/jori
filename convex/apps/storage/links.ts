import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type QueryLikeCtx } from "../../shared/context"

export async function getOrganizationApp(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    appId: Id<"apps">
  }
) {
  const app = await ctx.db.get(args.appId)

  if (app === null || app.organizationId !== args.organizationId) {
    throw new Error("App not found.")
  }

  return app
}

export async function insertCapabilities(
  ctx: MutationCtx,
  args: {
    organizationId: string
    appId: Id<"apps">
    versionId: Id<"appVersions">
    approvedBy: Id<"persons">
    capabilities: Array<{
      tool: string
      integrationId?: Id<"integrations">
      versionPinned?: boolean
    }>
  }
) {
  const now = Date.now()

  for (const capability of args.capabilities) {
    await ctx.db.insert("appTools", {
      organizationId: args.organizationId,
      appId: args.appId,
      versionId: capability.versionPinned === true ? args.versionId : undefined,
      tool: capability.tool,
      integrationId: capability.integrationId,
      approvedBy: args.approvedBy,
      approvedAt: now,
    })
  }
}

export async function revokeCapabilities(
  ctx: MutationCtx,
  appId: Id<"apps">,
  now: number
) {
  const capabilities = await ctx.db
    .query("appTools")
    .withIndex("by_app", (index) => index.eq("appId", appId))
    .take(200)

  for (const capability of capabilities) {
    if (capability.revokedAt === undefined) {
      await ctx.db.patch(capability._id, { revokedAt: now })
    }
  }
}

export function normalizeTitle(title: string) {
  const normalized = title.trim()

  if (normalized === "") {
    throw new Error("App title is required.")
  }

  return normalized.slice(0, 120)
}
