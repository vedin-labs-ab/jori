import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { eventMatch } from "../events/schema"
import { playbookBindingValidator } from "../playbooks/schema"
import { executionPrincipalValidator } from "../runs/principal"
import { scopeValidator } from "../shared/audience"
import { accessValidator, integrationValidator } from "../shared/integrations"

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
  playbook: v.optional(playbookBindingValidator),
  appId: v.optional(v.id("apps")),
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
  parentId: v.optional(v.id("automations")),
  configurationVersion: v.optional(v.number()),
  parentConfigurationVersion: v.optional(v.number()),
  keyPartition: v.optional(v.string()),
  name: v.string(),
  instructions: v.string(),
  /** Personal: owner-only. Organization: every member. See contracts/permissions/scope. */
  scope: scopeValidator,
  principal: executionPrincipalValidator,
  type: automationType,
  access,
  trigger,
  status,
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
  .index("by_app", ["appId"])
  .index("by_app_and_parent", ["appId", "parentId"])
  .index("by_parent", ["parentId"])
  .index("by_organization_status", ["organizationId", "status"])
  .index("by_organization_and_parent", ["organizationId", "parentId"])
  .index("by_organization_and_status_and_parent", [
    "organizationId",
    "status",
    "parentId",
  ])

export type AutomationTriggerInput = Infer<typeof triggerInput>
export type AutomationType = Infer<typeof automationType>
