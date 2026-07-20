import { defineTable } from "convex/server"
import { v } from "convex/values"
import { skillCategories } from "../../contracts/skills"
import { integrationValidator } from "../shared/integrations"

export const skillCategoryValidator = v.union(
  ...skillCategories.map((category) => v.literal(category))
)

export const skills = defineTable({
  organizationId: v.union(v.string(), v.null()),
  name: v.string(),
  description: v.string(),
  category: skillCategoryValidator,
  associatedIntegrations: v.optional(v.array(integrationValidator)),
  communication: v.optional(
    v.object({
      parts: v.record(v.string(), v.string()),
    })
  ),
  body: v.string(),
  createdBy: v.optional(v.id("persons")),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_organization", ["organizationId"])
  .index("by_organization_name", ["organizationId", "name"])
