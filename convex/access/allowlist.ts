import { v } from "convex/values"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"

/** One normalization, used by every read and every write, so an address
 *  added by hand matches the one the identity provider returns. */
function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function readAllowance(ctx: QueryCtx, email: string) {
  return await ctx.db
    .query("allowlist")
    .withIndex("by_email", (query) => query.eq("email", normalizeEmail(email)))
    .unique()
}

/** Better Auth decides whether an organization may be created from inside an
 *  action, where there is no database handle, so the check is reachable as a
 *  query rather than only as a helper. */
export const check = internalQuery({
  args: { email: v.optional(v.string()) },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    if (args.email === undefined) {
      return false
    }

    return (await readAllowance(ctx, args.email)) !== null
  },
})

/** Admitting a team is a deliberate act, so it is a command run against the
 *  deployment rather than a screen anyone can reach:
 *
 *    npx convex run access/allowlist:allow '{"email":"maya@copperline.app"}'
 */
export const allow = internalMutation({
  args: { email: v.string(), note: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email)
    const existing = await readAllowance(ctx, email)

    if (existing === null) {
      await ctx.db.insert("allowlist", {
        email,
        note: args.note,
        createdAt: Date.now(),
      })
    } else {
      await ctx.db.patch(existing._id, { note: args.note })
    }

    return null
  },
})

export const revoke = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await readAllowance(ctx, args.email)

    if (existing !== null) {
      await ctx.db.delete(existing._id)
    }

    return null
  },
})

/** Revoking does not close an organization the address already opened. Use
 *  this to see who is in before deciding what else has to happen. */
export const list = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      email: v.string(),
      note: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const rows = await ctx.db.query("allowlist").take(500)

    return rows.map((row) => ({
      email: row.email,
      note: row.note,
      createdAt: row.createdAt,
    }))
  },
})
