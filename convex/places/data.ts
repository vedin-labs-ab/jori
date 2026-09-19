import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { insertRow } from "../retention/write"
import { type QueryLikeCtx } from "../shared/context"
import { type PlaceVisibility, placeVisibility } from "./schema"

// The normalized descriptor provider edges attach to observed messages when
// they land in a place. Providers decide what qualifies (DMs never do);
// everything downstream is provider-agnostic.
export type ObservedPlace = {
  externalId: string
  name: string
  visibility: PlaceVisibility
  /** People outside the organization read what is posted here. */
  external?: boolean
}

export const observedPlaceValidator = v.object({
  externalId: v.string(),
  name: v.string(),
  visibility: placeVisibility,
  external: v.optional(v.boolean()),
})

export async function ensurePlace(
  ctx: MutationCtx,
  input: {
    integration: Doc<"integrations">
    place: ObservedPlace
  }
): Promise<Doc<"places">> {
  const existing = await findPlace(ctx, {
    organizationId: input.integration.organizationId,
    integrationId: input.integration._id,
    externalId: input.place.externalId,
  })

  if (existing !== null) {
    return await refreshPlace(ctx, existing, input.place)
  }

  return await insertRow(ctx, "places", {
    organizationId: input.integration.organizationId,
    integrationId: input.integration._id,
    externalId: input.place.externalId,
    name: input.place.name,
    visibility: input.place.visibility,
    external: input.place.external,
    claims: [],
  })
}

async function findPlace(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    integrationId: Doc<"integrations">["_id"]
    externalId: string
  }
) {
  return await ctx.db
    .query("places")
    .withIndex("by_organization_and_integration_and_external", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("integrationId", args.integrationId)
        .eq("externalId", args.externalId)
    )
    .unique()
}

// Identity facts ride along on every message, so renames and visibility
// changes heal on the next sighting.
async function refreshPlace(
  ctx: MutationCtx,
  place: Doc<"places">,
  observed: ObservedPlace
): Promise<Doc<"places">> {
  const facts = {
    name: observed.name,
    visibility: observed.visibility,
    external: observed.external,
  }

  if (
    place.name === facts.name &&
    place.visibility === facts.visibility &&
    place.external === facts.external
  ) {
    return place
  }

  await ctx.db.patch(place._id, facts)

  return { ...place, ...facts }
}
