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
    ceilingAt: place.profileAt,
    debounceMs: profileDebounceMs,
    maxDelayMs: profileMaxDelayMs,
  })

  if (place.functionId !== undefined) {
    await ctx.scheduler.cancel(place.functionId)
  }

  const functionId = await ctx.scheduler.runAt(
    schedule.runAt,
    internal.places.profile.run,
    { placeId: place._id }
  )

  await ctx.db.patch(place._id, {
    functionId,
    profileAt: schedule.ceilingAt,
  })
}
