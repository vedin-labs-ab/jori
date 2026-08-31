import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { nextDebounceSchedule } from "../shared/debounce"
import { profileDebounceMs, profileMaxDelayMs } from "./limits"

export async function schedulePlaceProfile(
  ctx: MutationCtx,
  place: Doc<"places">,
  now: number
) {
  const schedule = nextDebounceSchedule({
    now,
    ceilingAt: place.debounce?.ceilingAt,
    debounceMs: profileDebounceMs,
    maxDelayMs: profileMaxDelayMs,
  })

  if (place.debounce !== undefined) {
    await ctx.scheduler.cancel(place.debounce.functionId)
  }

  const functionId = await ctx.scheduler.runAt(
    schedule.runAt,
    internal.places.profile.run,
    { placeId: place._id }
  )

  await ctx.db.patch(place._id, {
    debounce: { ceilingAt: schedule.ceilingAt, functionId },
  })
}
