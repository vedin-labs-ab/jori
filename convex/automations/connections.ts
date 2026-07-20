import { v } from "convex/values"
import { automationEventCatalog } from "../../contracts/automations/events"
import { query } from "../_generated/server"
import { findIntegrationForPrincipal } from "../integrations/resolve"
import { resolveCurrentPerson } from "../persons/account"
import { executionPrincipalForScope } from "../runs/principal"
import { scopeValidator } from "../shared/audience"

export const list = query({
  args: {
    organizationId: v.string(),
    scope: scopeValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const principal = executionPrincipalForScope(args.scope, personId)

    return {
      integrations: await Promise.all(
        automationEventCatalog.map(async (definition) => ({
          integration: definition.integration,
          connected:
            (
              await findIntegrationForPrincipal(ctx, {
                integration: definition.integration,
                principal,
                organizationId: args.organizationId,
              })
            )?.status === "active",
        }))
      ),
    }
  },
})
