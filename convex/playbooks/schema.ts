import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { integrationValidator } from "../shared/integrations"

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

/**
 * The recipe input an enabled playbook was rendered from. Storing it makes
 * reconfiguring and upgrading deterministic re-renders: the same key,
 * version, and configuration always produce the same instructions,
 * schedule, and access.
 */
export const playbookBindingValidator = v.object({
  key: v.string(),
  version: v.number(),
  options: v.record(v.string(), v.union(v.boolean(), v.string(), v.number())),
  providers: v.record(v.string(), integrationValidator),
  destination: deliveryChoiceValidator,
})

export type PlaybookBinding = Infer<typeof playbookBindingValidator>

export const playbookPreferences = defineTable({
  organizationId: v.string(),
  personId: v.id("persons"),
  delivery: deliveryChoiceValidator,
  updatedAt: v.number(),
}).index("by_organization_and_person", ["organizationId", "personId"])
