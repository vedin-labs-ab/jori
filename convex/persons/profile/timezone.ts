import { isValidTimezone } from "../../../contracts/timezone"
import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type QueryLikeCtx } from "../../shared/context"

/** Store the member's browser-reported IANA zone; garbage is ignored so a
 *  bad client value never breaks the identity sync it rides on. */
export async function updatePersonTimezone(
  ctx: MutationCtx,
  personId: Id<"persons">,
  timezone: string
) {
  if (!isValidTimezone(timezone)) {
    return
  }

  const person = await ctx.db.get(personId)

  if (person === null || person.timezone === timezone) {
    return
  }

  await ctx.db.patch(personId, { timezone, updatedAt: Date.now() })
}

export async function readPersonTimezone(
  ctx: QueryLikeCtx,
  personId: Id<"persons"> | undefined
) {
  if (personId === undefined) {
    return null
  }

  const person = await ctx.db.get(personId)

  return person?.timezone ?? null
}

export async function requirePersonTimezone(
  ctx: QueryLikeCtx,
  personId: Id<"persons">
) {
  const timezone = await readPersonTimezone(ctx, personId)

  if (timezone === null) {
    throw new Error("Your timezone is required for recurring automations.")
  }

  return timezone
}
