import { defineSchema } from "convex/server"
import { approvals } from "./approvals/schema"
import {
  artifactAssets,
  artifactBlobs,
  artifactCaches,
  artifactEntries,
  artifactSessions,
  artifactShares,
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
import { integrationOffers } from "./integrations/offers/schema"
import { integrations } from "./integrations/schema"
import { messages } from "./messages/schema"
import {
  organizationDiscovery,
  organizationProfile,
  organizationSources,
} from "./organization/schema"
import { permissions } from "./permissions/schema"
import { identities } from "./persons/identity/schema"
import { persons } from "./persons/schema"
import { places } from "./places/schema"
import { playbookPreferences } from "./playbooks/schema"
import { reactions } from "./reactions/schema"
import { outbox } from "./runs/execution/outbox/schema"
import { sandboxes } from "./runs/execution/sandboxes/schema"
import { traces } from "./runs/execution/traces/schema"
import { waiters } from "./runs/execution/waiters/schema"
import { runs } from "./runs/schema"
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
  playbookPreferences,
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
  artifactShares,
  artifactAssets,
  artifactState,
  artifactCaches,
})
