import { v } from "convex/values"
import { type PlaceIntegration, placeKinds } from "../../contracts/places"
import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx, query } from "../_generated/server"
import { checkTenantAccess } from "../identity/access"
import { profileMissLimit } from "./limits"

// One read serves the whole tab: claims already live on the place row, so
// opening the detail sheet needs no second fetch. Lifecycle internals stay
// server-side; the console sees only a per-claim fading flag.
const fadingThreshold = profileMissLimit / 2

export const list = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const access = await checkTenantAccess(ctx, args.tenantId)

    if (!access.ok) {
      return { status: "unauthorized" as const, places: [] }
    }

    const rows = await ctx.db
      .query("places")
      .withIndex("by_tenant_and_integration_and_external", (index) =>
        index.eq("tenantId", args.tenantId)
      )
      .collect()
    const integrations = await integrationKinds(ctx, rows)

    return {
      status: "ready" as const,
      places: rows
        .sort(
          (first, second) =>
            (second.profiledAt ?? second._creationTime) -
            (first.profiledAt ?? first._creationTime)
        )
        .flatMap((row) => {
          const integration = integrations.get(row.integrationId)

          return integration === undefined ? [] : [listRow(row, integration)]
        }),
    }
  },
})

function listRow(row: Doc<"places">, integration: PlaceIntegration) {
  return {
    id: row._id,
    name: row.name,
    integration,
    visibility: row.visibility,
    profiledAt: row.profiledAt ?? null,
    watchingSince: row._creationTime,
    claims: row.claims.map((claim) => ({
      section: claim.section,
      text: claim.text,
      fading: claim.misses >= fadingThreshold,
    })),
  }
}

async function integrationKinds(
  ctx: QueryCtx,
  rows: Doc<"places">[]
): Promise<Map<Id<"integrations">, PlaceIntegration>> {
  const kinds = new Map<Id<"integrations">, PlaceIntegration>()

  for (const integrationId of new Set(rows.map((row) => row.integrationId))) {
    const integration = await ctx.db.get(integrationId)

    if (integration !== null && isPlaceIntegration(integration.integration)) {
      kinds.set(integrationId, integration.integration)
    }
  }

  return kinds
}

function isPlaceIntegration(value: string): value is PlaceIntegration {
  return value in placeKinds
}
