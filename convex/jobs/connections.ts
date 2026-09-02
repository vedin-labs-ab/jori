import { v } from "convex/values"
import { jobEventCatalog } from "../../contracts/jobs/events"
import { query } from "../_generated/server"
import { findIntegrationForPrincipal } from "../integrations/resolve"
import { resolveCurrentPerson } from "../persons/account"
import { executionPrincipalForPerson } from "../runs/principal"

export const list = query({
  args: {
    organizationId: v.string(),
    /** Which identity the job being edited would run as. */
    kind: v.union(v.literal("person"), v.literal("organization")),
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)

    if (args.kind === "person" && personId === undefined) {
      throw new Error("Personal jobs require a person.")
    }

    const principal =
      args.kind === "person"
        ? executionPrincipalForPerson(personId)
        : ({ kind: "organization" } as const)

    return {
      integrations: await Promise.all(
        jobEventCatalog.map(async (definition) => ({
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
