import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type GoogleIntegration } from "./config"

export async function findExistingGoogleIntegration(
  ctx: MutationCtx,
  args: {
    integration: GoogleIntegration
    tenantId: string
    createdBy: Id<"persons">
  }
): Promise<Doc<"integrations"> | null> {
  if (getGoogleIntegrationScope(args.integration) === "tenant") {
    return await ctx.db
      .query("integrations")
      .withIndex("by_tenant_and_integration", (query) =>
        query.eq("tenantId", args.tenantId).eq("integration", args.integration)
      )
      .order("desc")
      .first()
  }

  return await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_integration_and_owner", (query) =>
      query
        .eq("tenantId", args.tenantId)
        .eq("integration", args.integration)
        .eq("ownerId", args.createdBy)
    )
    .first()
}

export function getGoogleIntegrationScope(
  integration: GoogleIntegration
): Doc<"integrations">["scope"] {
  return integration === "googleDrive" ? "tenant" : "user"
}
