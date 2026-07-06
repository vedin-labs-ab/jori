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
import { conversations } from "./conversations/schema"
import { beliefs, efforts, evidence, journal, passes } from "./deduction/schema"
import { events } from "./events/schema"
import { identities } from "./identity/schema"
import { integrationOffers } from "./integrations/offers/schema"
import { integrations } from "./integrations/schema"
import { messages } from "./messages/schema"
import {
  organizationDiscovery,
  organizationProfile,
  organizationSources,
} from "./organization/schema"
import { permissions } from "./permissions/schema"
import { persons } from "./persons/schema"
import { places } from "./places/schema"
import { reactions } from "./reactions/schema"
import { runs } from "./runs/schema"
import { outbox, sandboxes } from "./runtime/schema"
import { traces } from "./runtime/traces/schema"
import { waiters } from "./runtime/waiters/schema"
import { sessions } from "./sessions/schema"
import { skills } from "./skills/schema"
import { transitions } from "./transitions"

export default defineSchema({
  skills,
  assets,
  persons,
  identities,
  integrations,
  integrationOffers,
  messages,
  places,
  organizationProfile,
  organizationSources,
  organizationDiscovery,
  automations,
  subscriptions,
  events,
  runs,
  conversations,
  beliefs,
  efforts,
  evidence,
  journal,
  passes,
  sessions,
  approvals,
  transitions,
  traces,
  outbox,
  waiters,
  sandboxes,
  permissions,
  reactions,
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
