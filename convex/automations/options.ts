import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { action, internalQuery } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { requireClerkUserId } from "../identity/users"
import { prepareIntegrationForRuntime } from "../integrations/runtime"
import { integrationValidator } from "../shared/integrations"
import {
  integrationUsesAutomationEventOptionSource,
  isAutomationEventOptionSource,
} from "./events"
import { integrationLabels, resolveEventIntegration } from "./integrations"
import {
  type AutomationEventOptionSearchResult,
  searchIntegrationOptions,
} from "./options/integrations"

const criteriaValidator = v.record(v.string(), v.union(v.string(), v.number()))

export const search = action({
  args: {
    tenantId: v.string(),
    integration: integrationValidator,
    source: v.string(),
    query: v.string(),
    criteria: v.optional(criteriaValidator),
  },
  handler: async (ctx, args): Promise<AutomationEventOptionSearchResult> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)

    if (
      !isAutomationEventOptionSource(args.source) ||
      !integrationUsesAutomationEventOptionSource(args.integration, args.source)
    ) {
      throw new Error("Choose a supported event option.")
    }

    const lookup: IntegrationLookup = await ctx.runQuery(
      internal.automations.options.integration,
      {
        tenantId: args.tenantId,
        integration: args.integration,
        createdBy: requireClerkUserId(identity),
      }
    )

    if (lookup.status === "unavailable") {
      return lookup
    }

    const integration = await prepareIntegrationForRuntime(ctx, {
      integration: lookup.integration,
    })

    return await searchIntegrationOptions({
      integration,
      source: args.source,
      query: args.query,
      criteria: args.criteria,
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
    createdBy: v.string(),
  },
  handler: async (ctx, args): Promise<IntegrationLookup> => {
    try {
      return {
        status: "ready",
        integration: await resolveEventIntegration(ctx, {
          tenantId: args.tenantId,
          integration: args.integration,
          createdBy: args.createdBy,
        }),
      }
    } catch {
      return {
        status: "unavailable",
        message: `Connect ${integrationLabels[args.integration]} before choosing event options.`,
      }
    }
  },
})
