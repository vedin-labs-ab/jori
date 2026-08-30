import { defineTable } from "convex/server"
import { v } from "convex/values"
import { visibilityValidator } from "../visibility/schema"

// A folder organizes and gates: its visibility cascades over everything
// filed inside it, so a viewer must be allowed by every ancestor folder as
// well as by a resource's own setting (see visibility/sight.ts). Unset
// visibility reads as organization-wide, the historical behavior.
export const folders = defineTable({
  organizationId: v.string(),
  name: v.string(),
  /** Who may see the folder and, by cascade, its contents. */
  visibility: v.optional(visibilityValidator),
  /** Absent = a root folder. */
  parentId: v.optional(v.id("folders")),
  createdBy: v.id("persons"),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_organization_and_parent", ["organizationId", "parentId"])
