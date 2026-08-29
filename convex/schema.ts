import { defineSchema } from "convex/server"
import { allowlist } from "./access/schema"
import { approvals } from "./approvals/schema"
import { automations } from "./automations/schema"
import { subscriptions } from "./automations/subscriptions/schema"
import { backfills } from "./backfill/schema"
import { billingAccounts, billingEntries } from "./billing/schema"
import { collections, documents, shares } from "./collections/schema"
import { conversations } from "./conversations/schema"
import { beliefs, efforts, evidence, journal, passes } from "./deduction/schema"
import { events } from "./events/schema"
import { files } from "./files/schema"
import { folders } from "./folders/schema"
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
import { reactions } from "./reactions/schema"
import { outbox } from "./runs/execution/outbox/schema"
import { sandboxes } from "./runs/execution/sandboxes/schema"
import { traces } from "./runs/execution/traces/schema"
import { waiters } from "./runs/execution/waiters/schema"
import { runs } from "./runs/schema"
import { sessions } from "./sessions/schema"
import { skills } from "./skills/schema"
import { transitions } from "./transitions/schema"
import { waitlist } from "./waitlist/schema"

export default defineSchema({
  skills,
  allowlist,
  waitlist,
  files,
  billingAccounts,
  billingEntries,
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
  backfills,
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
  collections,
  documents,
  shares,
  folders,
})
