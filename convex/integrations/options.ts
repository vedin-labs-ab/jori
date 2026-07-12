import { v } from "convex/values"
import {
  integrationForOptionSource,
  isIntegrationOptionSource,
} from "../../contracts/integrations/options"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { action, internalQuery } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { ensureCurrentPersonFromAction } from "../persons/clerk"
import { integrationValidator } from "../shared/integrations"
import {
  type IntegrationOptionSearchResult,
  searchIntegrationOptions,
} from "./options/load"
import { integrationLabels, resolveIntegrationForOwner } from "./resolve"
import { prepareIntegrationForRuntime } from "./runtime"

const matchValidator = v.record(v.string(), v.union(v.string(), v.number()))

export const search = action({
  args: {
    tenantId: v.string(),
    source: v.string(),
    query: v.string(),
    match: v.optional(matchValidator),
  },
  handler: async (ctx, args): Promise<IntegrationOptionSearchResult> => {
    await requireTenantAccess(ctx, args.tenantId)

    if (!isIntegrationOptionSource(args.source)) {
      throw new Error("Choose a supported integration option.")
    }

    const sourceIntegration = integrationForOptionSource(args.source)

    const lookup: IntegrationLookup = await ctx.runQuery(
      internal.integrations.options.integration,
      {
        tenantId: args.tenantId,
        integration: sourceIntegration,
        createdBy: await ensureCurrentPersonFromAction(ctx, args.tenantId),
      }
    )

    if (lookup.status === "unavailable") {
      return lookup
    }

    const runtimeIntegration = await prepareIntegrationForRuntime(ctx, {
      integration: lookup.integration,
    })

    return await searchIntegrationOptions({
      integration: runtimeIntegration,
      source: args.source,
      query: args.query,
      match: args.match,
    })
  },
})

type IntegrationLookup =
  | {
      status: "ready"
      integration: Doc<"integrations">
    }
  | {
      status: "unavailable"
      message: string
    }

export const integration = internalQuery({
  args: {
    tenantId: v.string(),
    integration: integrationValidator,
    createdBy: v.id("persons"),
  },
  handler: async (ctx, args): Promise<IntegrationLookup> => {
    try {
      return {
        status: "ready",
        integration: await resolveIntegrationForOwner(ctx, {
          tenantId: args.tenantId,
          integration: args.integration,
          ownerId: args.createdBy,
        }),
      }
    } catch {
      return {
        status: "unavailable",
        message: `Connect ${integrationLabels[args.integration]} before choosing options.`,
      }
    }
  },
})
