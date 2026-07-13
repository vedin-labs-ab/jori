import { defineTable } from "convex/server"
import { v } from "convex/values"

export const deliveryChoiceValidator = v.union(
  v.object({ kind: v.literal("email") }),
  v.object({
    kind: v.literal("slack"),
    target: v.union(
      v.object({ kind: v.literal("dm") }),
      v.object({
        kind: v.literal("channel"),
        id: v.string(),
        label: v.string(),
      })
    ),
  })
)

export const playbookPreferences = defineTable({
  tenantId: v.string(),
  personId: v.id("persons"),
  delivery: deliveryChoiceValidator,
  updatedAt: v.number(),
}).index("by_tenant_and_person", ["tenantId", "personId"])
