import { day, hour, minute } from "../clock"
import { chaseInstructions } from "../jobs"
import { type DemoRun } from "../types"
import { detail, recurring, run, schedule, tools } from "./details"

/** The runs Copperline's scheduled jobs left behind. */
export function scheduledRuns(now: number): DemoRun[] {
  return [watchRun(now), competitorRun(now), digestRun(now), releaseRun(now)]
}

/** The run the record section opens on: the newest, so it sits on top. */
export function chaseRun(now: number) {
  return run(now, {
    id: "chase",
    job: "chase",
    title: "Chase overdue invoices",
    task: chaseInstructions,
    result:
      "Three reminders sent: Harbor House, Beacon Works, Larkspur Hotels. Rows updated.",
    startedAgo: minute,
    durationMs: 48_000,
    source: recurring(),
    details: [
      schedule("Mondays at 08:00"),
      detail("folder", "Renewals"),
      tools([
        ["jori", ["list_table_rows", "update_table_row"]],
        ["slack", ["conversations_add_message"]],
      ]),
      detail("web_search", "Blocked"),
    ],
  })
}

function watchRun(now: number) {
  return run(now, {
    id: "watch",
    job: "watch",
    title: "Renewals watch",
    task: "Every morning, read the Customer renewals table and keep each row's status current.",
    result: "No renewals moved. Harbor House stays at risk.",
    startedAgo: 5 * hour + 12 * minute,
    durationMs: 31_000,
    source: recurring(),
    details: [
      schedule("Daily at 07:00"),
      detail("folder", "Renewals"),
      tools([
        ["jori", ["list_table_rows", "update_table_row"]],
        ["slack", ["conversations_add_message"]],
      ]),
      detail("web_search", "Blocked"),
    ],
  })
}

function competitorRun(now: number) {
  return run(now, {
    id: "competitor",
    job: "competitor",
    title: "Competitor watch",
    task: "Every morning, check the companies in the Competitor moves table for pricing or packaging changes.",
    error:
      "Web fetch failed: https://northwind.example/pricing timed out after 30s.",
    status: "failed",
    startedAgo: day + 5 * hour,
    durationMs: 30_000,
    source: recurring(),
    details: [
      schedule("Daily at 07:00"),
      detail("folder", "Marketing"),
      tools([["slack", ["conversations_add_message"]]]),
      detail("web_search", "Allowed"),
    ],
  })
}

function digestRun(now: number) {
  const startedAgo = 2 * day + 3 * hour

  return run(now, {
    id: "digest",
    job: "digest",
    title: "Design review digest",
    task: "Every weekday morning, collect the design comments from Linear and post a digest.",
    status: "stopped",
    startedAgo,
    durationMs: 12_000,
    source: {
      ...recurring(),
      stop: { actor: { type: "user", label: "Hanna Ek" } },
    },
    details: [
      detail("stopped", "Hanna Ek", undefined, now - startedAgo + 12_000),
      schedule("Weekdays at 09:00"),
      detail("folder", "Design"),
      tools([
        ["linear", ["linear_list_comments"]],
        ["slack", ["conversations_add_message"]],
      ]),
    ],
  })
}

function releaseRun(now: number) {
  return run(now, {
    id: "release",
    job: "release",
    title: "Weekly release summary",
    task: "Every Friday afternoon, read what merged in GitHub this week and what closed in Linear, then post a short summary to Slack.",
    result:
      "Posted the week to the eng channel: 14 merged, 2 reverted, 1 release.",
    startedAgo: 3 * day + 2 * hour,
    durationMs: 124_000,
    source: recurring(),
    details: [
      schedule("Fridays at 16:00"),
      detail("folder", "Engineering"),
      tools([
        ["github", ["github_search_issues", "github_get_pull_request"]],
        ["linear", ["linear_search_issues"]],
        ["slack", ["conversations_add_message"]],
      ]),
      detail("web_search", "Blocked"),
    ],
  })
}
