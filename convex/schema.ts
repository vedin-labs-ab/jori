import { defineSchema } from "convex/server"
import { approvals } from "./approvals/schema"
import { artifacts } from "./artifacts/schema"
import { activations } from "./attention/schema"
import { executions } from "./executions/schema"
import { triggers } from "./executions/triggers"
import { identities } from "./identity/schema"
import { integrations } from "./integrations/schema"
import { messages } from "./messages/schema"
import { permissions } from "./permissions/schema"
import { schedules } from "./scheduling/schema"
import { skills } from "./skills/schema"

export default defineSchema({
  skills,
  artifacts,
  identities,
  integrations,
  messages,
  schedules,
  triggers,
  activations,
  approvals,
  executions,
  permissions,
})
