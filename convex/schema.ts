import { defineSchema } from "convex/server"
import { activations } from "./activations/schema"
import { approvals } from "./approvals/schema"
import { artifacts } from "./artifacts/schema"
import { automations } from "./automations/schema"
import { subscriptions } from "./automations/subscriptions/schema"
import { events } from "./events/schema"
import { executions } from "./executions/schema"
import { identities } from "./identity/schema"
import { integrations } from "./integrations/schema"
import { messages } from "./messages/schema"
import { permissions } from "./permissions/schema"
import { runs } from "./runs/schema"
import { skillSettings, skills } from "./skills/schema"

export default defineSchema({
  skills,
  artifacts,
  identities,
  integrations,
  messages,
  automations,
  subscriptions,
  events,
  runs,
  activations,
  approvals,
  executions,
  permissions,
  skillSettings,
})
