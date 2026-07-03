import { v } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { internalQuery } from "../_generated/server"
import { integrationValidator } from "../shared/integrations"
import {
  findActiveIntegrationByExternalId,
  listActiveIntegrationsForOwner,
} from "./data"

export const activeByIntegrationExternal = internalQuery({
  args: {
    integration: integrationValidator,
    externalId: v.string(),
  },
  handler: async (ctx, args) =>
    await findActiveIntegrationByExternalId(ctx, args),
})

export const listActiveForRuntime = internalQuery({
  args: {
    tenantId: v.string(),
    ownerId: v.optional(v.id("persons")),
  },
  handler: async (ctx, args) => {
    return await listActiveIntegrationsForOwner(ctx, {
      ownerId: args.ownerId as Id<"persons"> | undefined,
      tenantId: args.tenantId,
    })
  },
})
