import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { action, internalQuery } from "../_generated/server"
import { requireTenantAccess } from "../identity/access"
import { requireClerkUserId } from "../identity/users"
import { prepareIntegrationForRuntime } from "../integrations/runtime"
import { integrationProviderValidator } from "../providers/catalog"
import {
  isAutomationEventOptionSource,
  providerUsesAutomationEventOptionSource,
} from "./events"
import {
  type AutomationEventOptionSearchResult,
  searchProviderOptions,
} from "./options/providers"
import { providerLabels, resolveEventIntegration } from "./providers"

const criteriaValidator = v.record(v.string(), v.union(v.string(), v.number()))

export const search = action({
  args: {
    tenantId: v.string(),
    provider: integrationProviderValidator,
    source: v.string(),
    query: v.string(),
    criteria: v.optional(criteriaValidator),
  },
  handler: async (ctx, args): Promise<AutomationEventOptionSearchResult> => {
    const identity = await requireTenantAccess(ctx, args.tenantId)

    if (
      !isAutomationEventOptionSource(args.source) ||
      !providerUsesAutomationEventOptionSource(args.provider, args.source)
    ) {
      throw new Error("Choose a supported event option.")
    }

    const lookup: IntegrationLookup = await ctx.runQuery(
      internal.automations.options.integration,
      {
        tenantId: args.tenantId,
        provider: args.provider,
        createdBy: requireClerkUserId(identity),
      }
    )

    if (lookup.status === "unavailable") {
      return lookup
    }

    const integration = await prepareIntegrationForRuntime(ctx, {
      integration: lookup.integration,
    })

    return await searchProviderOptions({
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
    provider: integrationProviderValidator,
    createdBy: v.string(),
  },
  handler: async (ctx, args): Promise<IntegrationLookup> => {
    try {
      return {
        status: "ready",
        integration: await resolveEventIntegration(ctx, {
          tenantId: args.tenantId,
          provider: args.provider,
          createdBy: args.createdBy,
        }),
      }
    } catch {
      return {
        status: "unavailable",
        message: `Connect ${providerLabels[args.provider]} before choosing event options.`,
      }
    }
  },
})
