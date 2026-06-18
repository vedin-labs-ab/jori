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
import { conversations } from "./conversations/schema"
import { events } from "./events/schema"
import { executions } from "./executions/schema"
import { files } from "./files/schema"
import { identities } from "./identity/schema"
import { integrations } from "./integrations/schema"
import { messages } from "./messages/schema"
import { permissions } from "./permissions/schema"
import { runs } from "./runs/schema"
import {
  outbox,
  runtimeEvents,
  runtimeSandboxes,
  runtimeSlackStatuses,
} from "./runtime/schema"
import { sessions } from "./sessions/schema"
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
  conversations,
  sessions,
  approvals,
  executions,
  runtimeEvents,
  outbox,
  runtimeSandboxes,
  runtimeSlackStatuses,
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
