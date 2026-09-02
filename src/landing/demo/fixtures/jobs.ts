import { getNextCronRunAt } from "@contracts/jobs/schedule/cron"
import { getToolPermission } from "@contracts/permissions"
import { type Job } from "@/shared/console/jobs/types"
import { day, hour, minute } from "./clock"
import { folderId } from "./folders"
import { demoId } from "./ids"
import { teamIds } from "./people"
import { jobAudience, type StoredVisibility } from "./types"

type JobSurface = Job["access"]["surfaces"][number]

/** Where Copperline's jobs run, so their schedules read in local time. */
export const demoTimezone = "Europe/Stockholm"

export function jobId(name: string) {
  return demoId("jobs", name)
}

/** The brief the editor section opens on, and the job the expanded run
 *  in the record section came from. */
export const chaseInstructions =
  "Every Monday, read the Customer renewals table. For each row past its renewal date where Paid is No, post one reminder in @Slack #finance naming the owner and the amount, following /reminders. Then set Reminded to Yes on that row and finish with a one-line summary."

/** One integration's share of a job's access, its level read off the
 *  catalog the way the console projects it. */
export function jobSurface(
  integration: JobSurface["integration"],
  tools: string[]
): JobSurface {
  const accesses = new Set(
    tools.map((tool) => getToolPermission(tool)?.access ?? "read")
  )
  const access =
    accesses.has("read") && accesses.has("write")
      ? "both"
      : accesses.has("write")
        ? "write"
        : "read"

  return { integration, access, tools }
}

const slackPosting = jobSurface("slack", ["conversations_add_message"])
const linearReading = jobSurface("linear", [
  "linear_search_issues",
  "linear_get_issue",
  "linear_list_comments",
])

/** Copperline's eight jobs, filed by the team that owns each. */
export function demoJobs(now: number): Job[] {
  return [
    releaseSummary(now),
    flakyTestTriage(now),
    ticketTriage(now),
    competitorWatch(now),
    changelog(now),
    renewalsWatch(now),
    chaseOverdueInvoices(now),
    designReviewDigest(now),
  ]
}

function releaseSummary(now: number) {
  return cronJob(now, {
    key: "release",
    name: "Weekly release summary",
    folder: "engineering",
    expression: "0 16 * * 5",
    instructions:
      "Every Friday afternoon, read what merged in @GitHub this week and what closed in @Linear, then post a short summary to @Slack in the eng channel: shipped, reverted, still open. Link every line.",
    surfaces: [
      jobSurface("github", ["github_search_issues", "github_get_pull_request"]),
      linearReading,
      slackPosting,
    ],
    firedAt: now - 3 * day - 2 * hour,
    createdAt: now - 40 * day,
  })
}

function flakyTestTriage(now: number) {
  return eventJob({
    key: "flaky",
    name: "Flaky test triage",
    folder: "engineering",
    integration: "github",
    instructions:
      "When a CI issue is opened in @GitHub, rerun the failing test, find the last commit it passed on, and comment with what changed and the fix.",
    surfaces: [
      jobSurface("github", [
        "github_get_issue",
        "github_get_file",
        "github_clone_repository",
        "github_add_issue_comment",
      ]),
    ],
    firedAt: now - 4 * minute,
    createdAt: now - 32 * day,
  })
}

function ticketTriage(now: number) {
  return eventJob({
    key: "triage",
    name: "Ticket triage",
    folder: "engineering",
    integration: "linear",
    instructions:
      "When someone comments on a @Linear issue asking for triage, label it, set the priority from the report, and assign the owner of the area. Reply in the thread with what you did, following /triage.",
    surfaces: [
      jobSurface("linear", [
        "linear_search_issues",
        "linear_get_issue",
        "linear_list_comments",
        "linear_add_comment",
      ]),
    ],
    firedAt: now - 26 * minute,
    createdAt: now - 28 * day,
  })
}

function competitorWatch(now: number) {
  return cronJob(now, {
    key: "competitor",
    name: "Competitor watch",
    folder: "marketing",
    expression: "0 7 * * *",
    instructions:
      "Every morning, check the companies in the Competitor moves table for pricing or packaging changes on their sites. Add a row for each change with its source, and post the day's changes to @Slack in the marketing channel.",
    surfaces: [slackPosting],
    webSearch: true,
    firedAt: now - 5 * hour,
    createdAt: now - 35 * day,
  })
}

function changelog(now: number) {
  return cronJob(now, {
    key: "changelog",
    name: "Changelog",
    folder: "marketing",
    expression: "0 10 * * 4",
    instructions:
      "Every Thursday, turn the week's merged pull requests in @GitHub into a customer-facing changelog, following /release-notes. Save it as a file in Marketing and post the link to @Slack in the marketing channel.",
    surfaces: [
      jobSurface("github", [
        "github_search_issues",
        "github_get_pull_request",
        "github_list_pull_request_files",
      ]),
      slackPosting,
    ],
    firedAt: now - 6 * day,
    createdAt: now - 33 * day,
  })
}

function renewalsWatch(now: number) {
  return cronJob(now, {
    key: "watch",
    name: "Renewals watch",
    folder: "renewals",
    expression: "0 7 * * *",
    instructions:
      "Every morning, read the Customer renewals table. Mark a row At risk when its renewal is inside 30 days and Paid is No, On track once the invoice is paid, and post a one-line status to @Slack in the finance channel only when something changed.",
    surfaces: [slackPosting],
    firedAt: now - 5 * hour - 12 * minute,
    createdAt: now - 30 * day,
  })
}

function chaseOverdueInvoices(now: number) {
  return cronJob(now, {
    key: "chase",
    name: "Chase overdue invoices",
    folder: "renewals",
    expression: "0 8 * * 1",
    instructions: chaseInstructions,
    surfaces: [slackPosting],
    visibility: { mode: "teams", teamIds: [teamIds.finance] },
    firedAt: now - 2 * hour - 10 * minute,
    createdAt: now - 21 * day,
  })
}

function designReviewDigest(now: number) {
  return cronJob(now, {
    key: "digest",
    name: "Design review digest",
    folder: "design",
    expression: "0 9 * * 1-5",
    instructions:
      "Every weekday morning, collect the design comments from @Linear and the new files in Design, and post a digest to @Slack in the design channel with what needs a decision today.",
    surfaces: [linearReading, slackPosting],
    status: "paused",
    firedAt: now - 2 * day,
    createdAt: now - 18 * day,
  })
}

type JobSpec = {
  key: string
  name: string
  folder: string
  instructions: string
  surfaces: JobSurface[]
  visibility?: StoredVisibility
  webSearch?: boolean
  status?: Job["status"]
  firedAt: number
  createdAt: number
}

function cronJob(now: number, spec: JobSpec & { expression: string }): Job {
  return {
    ...baseJob(spec),
    type: "cron",
    trigger: {
      expression: spec.expression,
      timezone: demoTimezone,
      nextAt: getNextCronRunAt(spec.expression, now, demoTimezone),
    },
  }
}

function eventJob(spec: JobSpec & { integration: "github" | "linear" }): Job {
  return {
    ...baseJob(spec),
    type: "event",
    trigger: {
      integration: spec.integration,
      event: "issue.comment.created",
      match: undefined,
    },
  }
}

function baseJob(spec: JobSpec) {
  const visibility = spec.visibility ?? { mode: "organization" as const }

  return {
    id: jobId(spec.key),
    key: undefined,
    name: spec.name,
    instructions: spec.instructions,
    audience: jobAudience(visibility),
    visibility,
    status: spec.status ?? ("active" as const),
    folderId: folderId(spec.folder),
    access: { webSearch: spec.webSearch ?? false, surfaces: spec.surfaces },
    createdAt: spec.createdAt,
    updatedAt: spec.firedAt,
    firedAt: spec.firedAt,
  }
}
