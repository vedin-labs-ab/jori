import { type Doc } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import {
  type IntegrationProvider,
  isUserScopedProvider,
} from "../providers/catalog"

type QueryLikeCtx = MutationCtx | QueryCtx

export const providerLabels = {
  github: "GitHub",
  gmail: "Gmail",
  googleCalendar: "Google Calendar",
  googleDrive: "Google Drive",
  linear: "Linear",
  microsoftCalendar: "Microsoft Calendar",
  microsoftEmail: "Outlook Mail",
  notion: "Notion",
  slack: "Slack",
} satisfies Record<IntegrationProvider, string>

export async function resolveEventIntegration(
  ctx: QueryLikeCtx,
  args: {
    provider: IntegrationProvider
    createdBy: string | undefined
    tenantId: string
  }
) {
  return await resolveProvider(ctx, args)
}

async function resolveProvider(
  ctx: QueryLikeCtx,
  args: {
    provider: IntegrationProvider
    createdBy: string | undefined
    tenantId: string
  }
): Promise<Doc<"integrations">> {
  const integration =
    isUserScopedProvider(args.provider) && args.createdBy !== undefined
      ? await ctx.db
          .query("integrations")
          .withIndex("by_tenant_and_provider_and_owner", (query) =>
            query
              .eq("tenantId", args.tenantId)
              .eq("provider", args.provider)
              .eq("ownerId", args.createdBy)
          )
          .first()
      : await ctx.db
          .query("integrations")
          .withIndex("by_tenant_and_provider", (query) =>
            query.eq("tenantId", args.tenantId).eq("provider", args.provider)
          )
          .first()

  if (integration === null || integration.status !== "active") {
    throw new Error(`${providerLabels[args.provider]} is not connected.`)
  }

  return integration
}
