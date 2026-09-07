import { defineTable } from "convex/server"
import { v } from "convex/values"
import { integrations } from "../../contracts/integrations"
import { skillCategories, skillSurfaces } from "../../contracts/skills"

export const skillCategoryValidator = v.union(
  ...skillCategories.map((category) => v.literal(category))
)

export const skillSurfaceValidator = v.union(
  ...skillSurfaces.map((surface) => v.literal(surface))
)

const skillFields = {
  organizationId: v.union(v.string(), v.null()),
  name: v.string(),
  description: v.string(),
  category: skillCategoryValidator,
  communication: v.optional(
    v.object({
      parts: v.record(v.string(), v.string()),
    })
  ),
  body: v.string(),
  createdBy: v.optional(v.id("persons")),
  createdAt: v.number(),
  updatedAt: v.number(),
}

// Exact old/new variants for the one-off US preservation migration only.
export const skills = defineTable(
  v.union(
    v.object({
      ...skillFields,
      surfaces: v.optional(v.array(skillSurfaceValidator)),
    }),
    v.object({
      ...skillFields,
      associatedIntegrations: v.optional(
        v.array(v.union(...integrations.map((value) => v.literal(value))))
      ),
    })
  )
)
  .index("by_organization", ["organizationId"])
  .index("by_organization_name", ["organizationId", "name"])
