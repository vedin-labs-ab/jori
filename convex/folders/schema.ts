import { defineTable } from "convex/server"
import { v } from "convex/values"

// A folder is pure organization, never authorization: it grants nothing and
// hides nothing. Visibility of a filed resource keeps flowing through its own
// domain's predicate, while every member sees every folder and its name. A
// future grants system may attach to folders; nothing here models access.
export const folders = defineTable({
  organizationId: v.string(),
  name: v.string(),
  /** Absent = a root folder. */
  parentId: v.optional(v.id("folders")),
  createdBy: v.id("persons"),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_organization_and_parent", ["organizationId", "parentId"])
