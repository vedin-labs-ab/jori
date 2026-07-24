import { defineTable } from "convex/server"
import { v } from "convex/values"

/**
 * Who may open an organization while Milo is closed.
 *
 * This is Milo's table, not Better Auth's. Better Auth owns who someone is;
 * which of those people may start using the product is a product decision,
 * and putting it in a generated auth table would mean editing a file that
 * says not to and re-deciding it on every regeneration.
 *
 * Membership of an existing organization is deliberately not gated. The unit
 * being admitted is a team, so an admitted founder can invite colleagues
 * without each of them needing a row here.
 */
export const allowlist = defineTable({
  /** Lowercased at every write and read, so a hand-added row still matches
   *  whatever casing the identity provider hands back. */
  email: v.string(),
  /** Why this address is here, for whoever reads the table in three months. */
  note: v.optional(v.string()),
  createdAt: v.number(),
}).index("by_email", ["email"])
