import { type Doc } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { type PlaceClaim } from "./schema"

// What a run gets to know about the place its message landed in: the claims
// as prompt-ready facts, lifecycle internals stripped. Loading from the
// message's own stamp is the privacy gate — no other place is reachable.
export type PlaceContext = {
  name: string
  claims: Pick<PlaceClaim, "section" | "text">[]
}

export async function readPlaceContext(
  ctx: QueryLikeCtx,
  message: Doc<"messages">
): Promise<PlaceContext | null> {
  if (message.placeId === undefined) {
    return null
  }

  const place = await ctx.db.get(message.placeId)

  if (place === null || place.claims.length === 0) {
    return null
  }

  return {
    name: place.name,
    claims: place.claims.map((claim) => ({
      section: claim.section,
      text: claim.text,
    })),
  }
}
