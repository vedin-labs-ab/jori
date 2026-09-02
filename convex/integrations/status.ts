import { v } from "convex/values"
import { isUserScopedIntegration } from "../../contracts/integrations"
import { query } from "../_generated/server"
import { integrationValidator } from "../shared/integrations"
import { getOrganizationIntegration, getUserIntegration } from "./data"

/** What the console's integration card shows for one integration: the
 *  connected account or workspace and whether it still works. User-scoped
 *  integrations answer for the caller alone. */
export const get = query({
  args: {
    organizationId: v.string(),
    integration: integrationValidator,
  },
  handler: async (ctx, args) => {
    const integration = isUserScopedIntegration(args.integration)
      ? await getUserIntegration(ctx, args)
      : await getOrganizationIntegration(ctx, args)

    if (integration === null) {
      return null
    }

    return {
      externalId: integration.externalId,
      name: integration.name,
      email: integration.email,
      url: integration.url,
      status: integration.status,
    }
  },
})
