import { defineSchema } from "convex/server"
import { executions } from "./schemas/executions"
import { identities } from "./schemas/identities"
import { integrations } from "./schemas/integrations"
import { messages } from "./schemas/messages"
import { permissions } from "./schemas/permissions"
import { schedules } from "./schemas/schedules"
import { skills } from "./schemas/skills"
import { traces } from "./schemas/traces"
import { triggers } from "./schemas/triggers"

export default defineSchema({
  skills,
  identities,
  integrations,
  messages,
  schedules,
  triggers,
  executions,
  traces,
  permissions,
})
