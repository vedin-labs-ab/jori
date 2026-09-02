import { getNextCronRunAt } from "../../contracts/jobs/schedule/cron"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type Access } from "../shared/integrations"
import {
  clearOrganization,
  daysAgo,
  type SeedContext,
  seedTimezone,
} from "./context"
import { resolveFolders } from "./library/folders"
import { resolveOwners } from "./people"
import { resolvePlaces, slackIntegration } from "./places"

// The standing work Vedin Labs has handed to Jori. Every one of these is
// written without a scheduled function id, which is what actually makes a
// trigger fire: the console shows the schedule and the next time, and nothing
// runs. A seeded deployment is a picture of a working workspace, not a
// workspace that starts spending the moment it is filled.

type SeedJob = {
  name: string
  instructions: string
  folder: string
  /** Who set it up, by the local part of their address. */
  owner: string
  status: "active" | "paused" | "completed"
  /** A cron expression, or the Slack channel an event trigger listens to. */
  cron?: string
  channel?: string
  tools: string[]
  web?: boolean
  created: number
  fired?: number
}

const jobs: SeedJob[] = [
  {
    name: "Friday shipped post",
    owner: "elin",
    instructions:
      "Every Friday afternoon, read what merged this week across GitHub and Linear and draft the shipped post for #general using the shipped-post skill. Leave it as a draft for Mia to send.",
    folder: "Releases",
    status: "active",
    cron: "0 15 * * 5",
    tools: ["github_search_issues", "linear_search_issues", "search_runs"],
    created: 51,
    fired: 3,
  },
  {
    name: "Monday pipeline prep",
    owner: "tobias",
    instructions:
      "Before the Monday review, bring the Customer accounts table up to date from the week's #gtm traffic, and list every account with no contact in fourteen days.",
    folder: "Pipeline",
    status: "active",
    cron: "30 7 * * 1",
    tools: ["read_table", "list_table_rows", "update_table_row"],
    created: 83,
    fired: 5,
  },
  {
    name: "Triage new support threads",
    owner: "priya",
    instructions:
      "When a message lands in #support, decide whether it is a new customer problem. If it is, draft the first reply and file an escalation row using the escalation-brief skill. Never send anything yourself.",
    folder: "Support",
    status: "active",
    channel: "support",
    tools: ["conversations_replies", "read_table", "insert_table_row"],
    created: 76,
    fired: 2,
  },
  {
    name: "Incident postmortem draft",
    owner: "oskar",
    instructions:
      "When an incident thread in #incidents is marked closed, draft the postmortem into Engineering / Incidents from the thread timeline, following the incident-timeline skill.",
    folder: "Incidents",
    status: "active",
    channel: "incidents",
    tools: ["conversations_replies", "search_files", "read_file"],
    created: 44,
    fired: 24,
  },
  {
    name: "Monthly vendor reconciliation",
    owner: "johan",
    instructions:
      "On the third of each month, compare the Vendor spend table against the invoices filed under Operations / Vendors and list every line that disagrees by more than five euro.",
    folder: "Vendors",
    status: "active",
    cron: "0 8 3 * *",
    tools: ["read_table", "list_table_rows", "search_files", "read_file"],
    created: 59,
    fired: 29,
  },
  {
    name: "Quiet account nudge",
    owner: "tobias",
    instructions:
      "Each Wednesday, find accounts with no Slack or email contact in three weeks and draft a short note to the owner naming what was last discussed.",
    folder: "Pipeline",
    status: "paused",
    cron: "0 9 * * 3",
    tools: ["conversations_search_messages", "read_table", "list_table_rows"],
    web: true,
    created: 68,
    fired: 32,
  },
  {
    name: "Weekly escalation sweep",
    owner: "priya",
    instructions:
      "Every Thursday, list escalations still unresolved and post the list into #support so the weekly review has it.",
    folder: "Support",
    status: "paused",
    cron: "0 13 * * 4",
    tools: ["read_table", "list_table_rows"],
    created: 72,
    fired: 16,
  },
]

export async function seedJobs(ctx: MutationCtx, seed: SeedContext) {
  const owners = await resolveOwners(ctx, seed)
  const folders = await resolveFolders(ctx, seed)
  const integration = await slackIntegration(ctx, seed)
  const places = await resolvePlaces(ctx, seed)

  await clearOrganization(ctx, ["jobs"], seed.organizationId)

  for (const job of jobs) {
    const createdAt = daysAgo(seed, job.created, 12)

    await ctx.db.insert("jobs", {
      organizationId: seed.organizationId,
      name: job.name,
      instructions: job.instructions,
      visibility: { mode: "organization" },
      principal: { kind: "organization" },
      version: 1,
      type: job.cron === undefined ? "event" : "cron",
      access: toAccess(job, integration._id),
      trigger: toTrigger(seed, job, {
        integrationId: integration._id,
        channel: places.get(job.channel ?? "")?.externalId,
      }),
      status: job.status,
      folderId: folders.get(job.folder),
      createdBy: owners(job.owner),
      createdAt,
      updatedAt: createdAt,
      firedAt:
        job.fired === undefined ? undefined : daysAgo(seed, job.fired, 15),
    })
  }

  return jobs.length
}

function toAccess(job: SeedJob, integrationId: Id<"integrations">): Access {
  return {
    integrations: [{ id: integrationId, tools: job.tools }],
    web: job.web ?? false,
  }
}

/** No functionId anywhere: the console reads the schedule from the trigger,
 *  but only a scheduled function actually fires one. */
function toTrigger(
  seed: SeedContext,
  job: SeedJob,
  refs: { integrationId: Id<"integrations">; channel: string | undefined }
) {
  if (job.cron === undefined) {
    if (refs.channel === undefined) {
      throw new Error(`${job.name} names a channel that is not seeded.`)
    }

    return {
      integrationId: refs.integrationId,
      event: "message.created",
      match: { channel: refs.channel },
    }
  }

  return {
    expression: job.cron,
    timezone: seedTimezone,
    nextAt: getNextCronRunAt(job.cron, seed.now, seedTimezone),
  }
}
