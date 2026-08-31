import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { eventMatch } from "../events/schema"
import { executionPrincipalValidator } from "../runs/principal"
import { accessValidator, integrationValidator } from "../shared/integrations"
import { visibilityValidator } from "../visibility/schema"

export const accessInput = v.object({
  integrations: v.array(
    v.object({
      integration: integrationValidator,
      tools: v.array(v.string()),
    })
  ),
  web: v.boolean(),
})

export const access = accessValidator

export const automationBinding = {
  key: v.optional(v.string()),
}

export const triggerInput = v.union(
  v.object({
    at: v.string(),
  }),
  v.object({
    expression: v.string(),
    timezone: v.string(),
  }),
  v.object({
    integration: integrationValidator,
    event: v.string(),
    match: v.optional(eventMatch),
  })
)

const trigger = v.union(
  v.object({
    at: v.number(),
    functionId: v.optional(v.id("_scheduled_functions")),
  }),
  v.object({
    expression: v.string(),
    timezone: v.string(),
    nextAt: v.number(),
    functionId: v.optional(v.id("_scheduled_functions")),
  }),
  v.object({
    integrationId: v.id("integrations"),
    event: v.string(),
    match: v.optional(eventMatch),
  })
)

export const status = v.union(
  v.literal("active"),
  v.literal("paused"),
  v.literal("completed")
)

export const automationType = v.union(
  v.literal("once"),
  v.literal("cron"),
  v.literal("event")
)

export const automations = defineTable({
  organizationId: v.string(),
  ...automationBinding,
  /** Set on a one-shot automation an automation created: the durable owner
   *  and the configuration generation it was owned at, so the child falls out
   *  of validity the moment the owner is edited. */
  parent: v.optional(
    v.object({
      id: v.id("automations"),
      version: v.optional(v.number()),
    })
  ),
  /** This automation's own configuration generation, bumped on every edit
   *  that invalidates owned children and their in-flight runs. */
  version: v.optional(v.number()),
  keyPartition: v.optional(v.string()),
  name: v.string(),
  instructions: v.string(),
  /** Who may see the automation. Private automations execute as their
   *  person, shared ones as the organization (see runs/principal). */
  visibility: visibilityValidator,
  principal: executionPrincipalValidator,
  type: automationType,
  access,
  trigger,
  status,
  /** Filing only — folders carry no access semantics. */
  folderId: v.optional(v.id("folders")),
  createdBy: v.optional(v.id("persons")),
  createdAt: v.number(),
  updatedAt: v.number(),
  firedAt: v.optional(v.number()),
})
  .index("by_organization", ["organizationId"])
  .index("by_organization_and_key_partition_and_key", [
    "organizationId",
    "keyPartition",
    "key",
  ])
  .index("by_parent", ["parent.id"])
  .index("by_organization_status", ["organizationId", "status"])
  .index("by_organization_and_parent", ["organizationId", "parent.id"])
  .index("by_organization_and_status_and_parent", [
    "organizationId",
    "status",
    "parent.id",
  ])
  .index("by_folder", ["folderId"])

export type AutomationTriggerInput = Infer<typeof triggerInput>
export type AutomationType = Infer<typeof automationType>
