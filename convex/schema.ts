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
import { assets } from "./assets/schema"
import { automations } from "./automations/schema"
import { subscriptions } from "./automations/subscriptions/schema"
import { events } from "./events/schema"
import { identities } from "./identity/schema"
import { integrationOffers } from "./integrations/offers/schema"
import { integrations } from "./integrations/schema"
import { messages } from "./messages/schema"
import { permissions } from "./permissions/schema"
import { runs } from "./runs/schema"
import { outbox, sandboxes, traces } from "./runtime/schema"
import { waiters } from "./runtime/waiters/schema"
import { sessions } from "./sessions/schema"
import { skills } from "./skills/schema"
import { transitions } from "./transitions"
import { watches } from "./watches/schema"

export default defineSchema({
  skills,
  assets,
  identities,
  integrations,
  integrationOffers,
  messages,
  automations,
  subscriptions,
  events,
  runs,
  watches,
  sessions,
  approvals,
  transitions,
  traces,
  outbox,
  waiters,
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
