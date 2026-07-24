import { ConvexError } from "convex/values"
import { type MutationCtx } from "../_generated/server"

/** A minute of writes is generous for real signups and cheap to check. */
const windowMs = 60 * 1000
const windowLimit = 20

/**
 * The guard for a deliberately anonymous public endpoint.
 *
 * Every other public function authenticates its caller. The waitlist cannot:
 * joining it is the one write a stranger is meant to make. Anonymity is not a
 * reason to be unguarded, so the ceiling stands in for identity. It bounds how
 * fast the table can grow and, more importantly, how fast Milo can be made to
 * send mail, which costs money and sender reputation.
 *
 * Repeat submissions from one address update in place rather than inserting,
 * so this only ever counts distinct new addresses.
 */
export async function requireAnonymousSignup(ctx: MutationCtx) {
  const recent = await ctx.db
    .query("waitlist")
    .withIndex("by_created_at", (query) =>
      query.gt("createdAt", Date.now() - windowMs)
    )
    .take(windowLimit + 1)

  if (recent.length > windowLimit) {
    throw new ConvexError("Too many signups right now. Try again in a minute.")
  }
}
