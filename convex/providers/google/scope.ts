import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type GoogleIntegration } from "./config"

export async function findExistingGoogleIntegration(
  ctx: MutationCtx,
  args: {
    provider: GoogleIntegration
    tenantId: string
    createdBy: string
  }
): Promise<Doc<"integrations"> | null> {
  if (getGoogleIntegrationScope(args.provider) === "tenant") {
    return await ctx.db
      .query("integrations")
      .withIndex("by_tenant_and_provider", (query) =>
        query.eq("tenantId", args.tenantId).eq("provider", args.provider)
      )
      .order("desc")
      .first()
  }

  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_provider_and_owner", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("provider", args.provider)
        .eq("ownerId", args.createdBy)
    )
    .first()
}

export function getGoogleIntegrationScope(
  provider: GoogleIntegration
): Doc<"integrations">["scope"] {
  return provider === "googleDrive" ? "tenant" : "user"
}
