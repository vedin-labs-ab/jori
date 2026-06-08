import { defineSchema } from "convex/server"
import { activations } from "./schemas/activations"
import { executions } from "./schemas/executions"
import { integrations } from "./schemas/integrations"
import { messages } from "./schemas/messages"
import { schedules } from "./schemas/schedules"
import { skills } from "./schemas/skills"
import { traces } from "./schemas/traces"
import { triggers } from "./schemas/triggers"

export default defineSchema({
  skills,
  integrations,
  messages,
  schedules,
  triggers,
  activations,
  executions,
  traces,
})
