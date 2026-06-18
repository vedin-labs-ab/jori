import { defineSchema } from "convex/server"
import { activations } from "./activations/schema"
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
import { executions } from "./executions/schema"
import { files } from "./files/schema"
import { identities } from "./identity/schema"
import { integrations } from "./integrations/schema"
import { messages } from "./messages/schema"
import { permissions } from "./permissions/schema"
import { runs } from "./runs/schema"
import {
  runtimeEvents,
  runtimeOutbox,
  runtimeSandboxes,
} from "./runtime/schema"
import { skills } from "./skills/schema"

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
  activations,
  approvals,
  executions,
  runtimeEvents,
  runtimeOutbox,
  runtimeSandboxes,
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
