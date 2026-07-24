import { v } from "convex/values"
import { readWaitlistEntry } from "../../contracts/waitlist"
import { mutation } from "../_generated/server"
import { requireAnonymousSignup } from "../access/anonymous"
import { sendWaitlistConfirmation } from "./email"

/** Public and unauthenticated: this is the only write a stranger can make, so
 *  a rate ceiling stands in for caller identity. Validation is the contract's,
 *  so the form and the server agree, and the outcome comes back as a value the
 *  form can render rather than an error. */
export const join = mutation({
  args: {
    email: v.string(),
    size: v.string(),
    work: v.string(),
  },
  returns: v.union(
    v.object({ status: v.literal("joined") }),
    v.object({ status: v.literal("rejected"), message: v.string() })
  ),
  handler: async (ctx, args) => {
    await requireAnonymousSignup(ctx)

    const result = readWaitlistEntry(args)

    if ("error" in result) {
      return { status: "rejected" as const, message: result.error }
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
