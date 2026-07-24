import { defineTable } from "convex/server"
import { v } from "convex/values"
import { teamSizes } from "../../contracts/waitlist"

/** Derived from the contract so the stored bands and the form's options
 *  cannot drift apart. */
const teamSize = v.union(...teamSizes.map((size) => v.literal(size)))

/** One row per address. Re-submitting updates the answers rather than adding
 *  a second row, so the table is a list of people, not of form posts. */
export const waitlist = defineTable({
  email: v.string(),
  size: teamSize,
  work: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_email", ["email"])
