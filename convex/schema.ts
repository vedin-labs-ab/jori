import { defineSchema } from "convex/server"
import { approvals } from "./approvals/schema"
import {
  artifactAssets,
  artifactBlobs,
  artifactCaches,
  artifactEntries,
  artifactSessions,
  artifactState,
  artifacts,
  artifactTools,
  artifactTrees,
  artifactVersions,
} from "./artifacts/schema"
import { automations } from "./automations/schema"
import { subscriptions } from "./automations/subscriptions/schema"
import { events } from "./events/schema"
import { files } from "./files/schema"
import { identities } from "./identity/schema"
import { integrations } from "./integrations/schema"
import { messages } from "./messages/schema"
import { permissions } from "./permissions/schema"
import { routing } from "./routing/schema"
import { runs } from "./runs/schema"
import { outbox, sandboxes, traces } from "./runtime/schema"
import { sessions } from "./sessions/schema"
import { skills } from "./skills/schema"
import { watches } from "./watches/schema"

export default defineSchema({
  skills,
  files,
  identities,
  integrations,
  messages,
  automations,
  subscriptions,
  events,
  runs,
  watches,
  sessions,
  approvals,
  routing,
  traces,
  outbox,
  sandboxes,
  permissions,
  artifacts,
  artifactVersions,
  artifactTrees,
  artifactEntries,
  artifactBlobs,
  artifactTools,
  artifactSessions,
  artifactAssets,
  artifactState,
  artifactCaches,
})
