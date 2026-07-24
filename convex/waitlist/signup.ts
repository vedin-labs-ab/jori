import { v } from "convex/values"
import { readWaitlistEntry } from "../../contracts/waitlist"
import { internalMutation } from "../_generated/server"
import { sendWaitlistConfirmation } from "./email"
import { rateLimiter } from "./limits"

/** Requests that arrive without a usable address share one bucket, so a
 *  missing header cannot be used to skip the per-address limit. */
const unknownAddress = "unknown"

/**
 * Internal on purpose. The public surface is the HTTP route in ./http, which
 * is the only place the caller's address can be read; this holds the logic so
 * the transport layer stays thin.
 *
 * The result is identical whether an address is new or already on the list,
 * so nothing here reveals who has signed up.
 */
export const join = internalMutation({
  args: {
    address: v.optional(v.string()),
    email: v.string(),
    size: v.string(),
    work: v.string(),
  },
  returns: v.union(
    v.object({ status: v.literal("joined") }),
    v.object({ status: v.literal("throttled") }),
    v.object({
      status: v.literal("rejected"),
      field: v.string(),
      message: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const perAddress = await rateLimiter.limit(
      ctx,
      "waitlistSignupPerAddress",
      {
        key: args.address ?? unknownAddress,
      }
    )
    const total = await rateLimiter.limit(ctx, "waitlistSignupTotal")

    if (!perAddress.ok || !total.ok) {
      return { status: "throttled" as const }
    }

    const result = readWaitlistEntry(args)

    if ("rejection" in result) {
      return { status: "rejected" as const, ...result.rejection }
    }

    const { entry } = result
    const now = Date.now()
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (query) => query.eq("email", entry.email))
      .unique()

    if (existing === null) {
      await ctx.db.insert("waitlist", {
        ...entry,
        createdAt: now,
        updatedAt: now,
      })
      await sendWaitlistConfirmation(ctx, entry.email)
    } else {
      await ctx.db.patch(existing._id, { ...entry, updatedAt: now })
    }

    return { status: "joined" as const }
  },
})
