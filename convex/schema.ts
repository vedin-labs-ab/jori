import { defineSchema } from "convex/server"
import { activations } from "./schemas/activations"
import { executions } from "./schemas/executions"
import { integrations } from "./schemas/integrations"
import { skills } from "./schemas/skills"
import { sourceItems } from "./schemas/sourceItems"
import { traces } from "./schemas/traces"
import { triggers } from "./schemas/triggers"

export default defineSchema({
  skills,
  integrations,
  sourceItems,
  triggers,
  activations,
  executions,
  traces,
})
