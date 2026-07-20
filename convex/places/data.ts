import { v } from "convex/values"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type QueryLikeCtx } from "../shared/context"
import { type PlaceVisibility, placeVisibility } from "./schema"

// The normalized descriptor provider edges attach to observed messages when
// they land in a place. Providers decide what qualifies (DMs never do);
// everything downstream is provider-agnostic.
export type ObservedPlace = {
  externalId: string
  name: string
  visibility: PlaceVisibility
}

export const observedPlaceValidator = v.object({
  externalId: v.string(),
  name: v.string(),
  visibility: placeVisibility,
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

  const placeId = await ctx.db.insert("places", {
    organizationId: input.integration.organizationId,
    integrationId: input.integration._id,
    externalId: input.place.externalId,
    name: input.place.name,
    visibility: input.place.visibility,
    claims: [],
  })
  const place = await ctx.db.get(placeId)

  if (place === null) {
    throw new Error("Place insert failed.")
  }

  return place
}

export async function findPlace(
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
  if (
    place.name === observed.name &&
    place.visibility === observed.visibility
  ) {
    return place
  }

  await ctx.db.patch(place._id, {
    name: observed.name,
    visibility: observed.visibility,
  })

  return { ...place, name: observed.name, visibility: observed.visibility }
}
