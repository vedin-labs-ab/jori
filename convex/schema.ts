import { defineSchema } from "convex/server"
import { allowlist } from "./access/schema"
import { approvals } from "./approvals/schema"
import { billingCancellations } from "./billing/polar/schema"
import { billingRefunds } from "./billing/refunds/schema"
import { accounts, transactions } from "./billing/schema"
import { usageReceipts } from "./billing/usage/schema"
import { collections, documents, shares } from "./collections/schema"
import { conversations } from "./conversations/schema"
import { discoverySandboxes } from "./discovery/extraction/records"
import {
  discoveryPassages,
  discoveryQueues,
  discoveryScans,
  discoverySources,
} from "./discovery/schema"
import { emailSubmissions } from "./email/schema"
import { events } from "./events/schema"
import { uploads } from "./files/blobs/schema"
import { fileUsage } from "./files/capacity/schema"
import { files } from "./files/schema"
import { folders } from "./folders/schema"
import { githubRecoveries } from "./integrations/github/ingress/schema"
import { notionWebhookSetups } from "./integrations/notion/setup/schema"
import { integrationOffers } from "./integrations/offers/schema"
import { outsiders } from "./integrations/outsiders/schema"
import { integrationInstalls, integrations } from "./integrations/schema"
import { webhookDeliveries } from "./integrations/webhooks/schema"
import { jobs } from "./jobs/schema"
import { subscriptions } from "./jobs/subscriptions/schema"
import { messages } from "./messages/schema"
import { models } from "./model/schema"
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
import { workspaceRetention } from "./retention/schema"
import { drafts } from "./runs/execution/drafts/schema"
import { sandboxes } from "./runs/execution/sandboxes/schema"
import { traces } from "./runs/execution/traces/schema"
import { transcript } from "./runs/execution/transcript/schema"
import { waiters } from "./runs/execution/waiters/schema"
import { runs } from "./runs/schema"
import { sessions } from "./sessions/schema"
import { skills } from "./skills/schema"
import { transitions } from "./transitions/schema"
import { usage } from "./usage/schema"
import { waitlist } from "./waitlist/schema"

export default defineSchema({
  discoverySources,
  discoveryQueues,
  discoveryPassages,
  discoveryScans,
  discoverySandboxes,
  workspaceRetention,
  githubRecoveries,
  notionWebhookSetups,
  emailSubmissions,
  skills,
  allowlist,
  waitlist,
  files,
  fileUsage,
  uploads,
  accounts,
  billingRefunds,
  billingCancellations,
  transactions,
  usageReceipts,
  persons,
  identities,
  integrations,
  outsiders,
  webhookDeliveries,
  integrationInstalls,
  integrationOffers,
  messages,
  models,
  places,
  organizationProfile,
  organizationSources,
  organizationDiscovery,
  jobs,
  subscriptions,
  events,
  runs,
  conversations,
  sessions,
  approvals,
  transitions,
  traces,
  transcript,
  drafts,
  waiters,
  sandboxes,
  permissions,
  reactions,
  collections,
  documents,
  shares,
  folders,
  usage,
})
