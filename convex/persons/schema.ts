import { defineTable } from "convex/server"
import { v } from "convex/values"

export const persons = defineTable({
  tenantId: v.string(),
  supersededBy: v.optional(v.id("persons")),
  /** IANA zone captured from the member's browser at console sign-in;
   *  gives every run a correct local-time line. */
  timezone: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_tenant", ["tenantId"])
