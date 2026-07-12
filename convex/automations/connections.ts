import { v } from "convex/values"
import { query } from "../_generated/server"
import { findIntegrationForPrincipal } from "../integrations/resolve"
import { resolveCurrentPerson } from "../persons/clerk"
import { executionPrincipalForScope } from "../runs/principal"
import { scopeValidator } from "../shared/audience"
import { automationEventCatalog } from "./events"

export const list = query({
  args: {
    tenantId: v.string(),
    scope: scopeValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.tenantId)
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
                tenantId: args.tenantId,
              })
            )?.status === "active",
        }))
      ),
    }
  },
})
