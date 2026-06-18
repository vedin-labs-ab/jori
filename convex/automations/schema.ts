import { defineTable } from "convex/server"
import { type Infer, v } from "convex/values"
import { integrationValidator } from "../shared/integrations"

const eventCriteriaValue = v.union(v.string(), v.number())
const eventCriteria = v.record(v.string(), eventCriteriaValue)

export const accessInput = v.object({
  integrations: v.array(
    v.object({
      integration: integrationValidator,
      tools: v.array(v.string()),
    })
  ),
  web: v.boolean(),
})

export const access = v.object({
  integrations: v.array(
    v.object({
      integrationId: v.id("integrations"),
      tools: v.array(v.string()),
    })
  ),
  web: v.boolean(),
})

export const triggerInput = v.union(
  v.object({
    type: v.literal("once"),
    at: v.string(),
  }),
  v.object({
    type: v.literal("cron"),
    cron: v.string(),
  }),
  v.object({
    type: v.literal("event"),
    integration: integrationValidator,
    event: v.string(),
    criteria: v.optional(eventCriteria),
    filter: v.optional(v.string()),
  })
)

export const trigger = v.union(
  v.object({
    type: v.literal("once"),
    at: v.number(),
    functionId: v.optional(v.id("_scheduled_functions")),
  }),
  v.object({
    type: v.literal("cron"),
    cron: v.string(),
    nextAt: v.number(),
    functionId: v.optional(v.id("_scheduled_functions")),
  }),
  v.object({
    type: v.literal("event"),
    integrationId: v.id("integrations"),
    event: v.string(),
    criteria: v.optional(eventCriteria),
    filter: v.optional(v.string()),
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
  tenantId: v.string(),
  artifactId: v.optional(v.id("artifacts")),
  name: v.string(),
  instructions: v.string(),
  type: automationType,
  access,
  trigger,
  status,
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  firedAt: v.optional(v.number()),
})
  .index("by_tenant", ["tenantId"])
  .index("by_artifact", ["artifactId"])
  .index("by_tenant_status", ["tenantId", "status"])

export type AutomationTriggerInput = Infer<typeof triggerInput>
