import { type ActivityResult } from "@/shared/console/runs/activity/types"
import { day, hour, minute } from "../clock"
import { demoId } from "../ids"
import { log, reminders, type Step, updates } from "./steps"

/** What each run did, keyed by the run's id. */
export function demoActivity(now: number): Record<string, ActivityResult> {
  return {
    [demoId("runs", "chase")]: log(
      now - 2 * hour - 10 * minute,
      "chase",
      chaseSteps()
    ),
    [demoId("runs", "harbor")]: log(now - 3 * minute, "harbor", harborSteps()),
    [demoId("runs", "payroll")]: log(
      now - 4 * minute,
      "payroll",
      payrollSteps()
    ),
    [demoId("runs", "tip")]: log(now - 9 * minute, "tip", tipSteps()),
    [demoId("runs", "triage")]: log(now - 26 * minute, "triage", triageSteps()),
    [demoId("runs", "vendor")]: log(now - hour, "vendor", vendorSteps()),
    [demoId("runs", "watch")]: log(
      now - 5 * hour - 12 * minute,
      "watch",
      watchSteps()
    ),
    [demoId("runs", "competitor")]: log(
      now - day - 5 * hour,
      "competitor",
      competitorSteps()
    ),
    [demoId("runs", "digest")]: log(
      now - 2 * day - 3 * hour,
      "digest",
      digestSteps()
    ),
    [demoId("runs", "release")]: log(
      now - 3 * day - 2 * hour,
      "release",
      releaseSteps()
    ),
  }
}

/** The log the record section opens on: a scheduled start, the table
 *  read, three reminders, three rows updated, and the receipt. */
function chaseSteps(): Step[] {
  return [
    { kind: "start" },
    { kind: "think", ms: 3_100, input: 4_200, output: 180, actions: 1 },
    {
      kind: "tool",
      tool: "list_table_rows",
      ms: 400,
      target: "Customer renewals",
      outcome: "4 rows",
    },
    { kind: "think", ms: 4_600, input: 12_000, output: 1_000, actions: 3 },
    ...reminders(["Harbor House", "Beacon Works", "Larkspur Hotels"]),
    { kind: "think", ms: 2_800, input: 13_100, output: 260, actions: 3 },
    ...updates(3),
    { kind: "think", ms: 2_200, input: 13_600, output: 90, actions: 0 },
    { kind: "end", status: "completed" },
  ]
}

function harborSteps(): Step[] {
  return [
    { kind: "start" },
    { kind: "think", ms: 2_400, input: 3_900, output: 140, actions: 1 },
    {
      kind: "tool",
      tool: "list_table_rows",
      ms: 300,
      target: "Customer renewals",
      outcome: "3 rows",
    },
    { kind: "think", ms: 3_000, input: 5_200, output: 210, actions: 1 },
    {
      kind: "tool",
      tool: "insert_table_row",
      ms: 350,
      target: "Customer renewals",
      outcome: "1 row inserted",
    },
    { kind: "think", ms: 1_900, input: 5_600, output: 80, actions: 0 },
    { kind: "end", status: "completed" },
  ]
}

function payrollSteps(): Step[] {
  return [
    { kind: "start" },
    { kind: "think", ms: 2_900, input: 6_100, output: 220, actions: 2 },
    {
      kind: "tool",
      tool: "github_get_issue",
      ms: 700,
      target: "copperline/payroll#491",
    },
    {
      kind: "tool",
      tool: "github_clone_repository",
      ms: 6_400,
      target: "copperline/payroll",
    },
    { kind: "think", ms: 5_200, input: 14_800, output: 640, actions: 1 },
    {
      kind: "tool",
      tool: "github_get_file",
      ms: 500,
      target: "payroll/sync.test.ts",
    },
    { kind: "live" },
  ]
}

function tipSteps(): Step[] {
  return [
    { kind: "start" },
    { kind: "think", ms: 2_600, input: 5_400, output: 190, actions: 2 },
    { kind: "tool", tool: "linear_get_issue", ms: 600, target: "COP-73" },
    {
      kind: "tool",
      tool: "linear_list_comments",
      ms: 500,
      target: "COP-73",
      outcome: "6 comments",
    },
    { kind: "think", ms: 4_100, input: 9_700, output: 410, actions: 1 },
    {
      kind: "approval",
      summary:
        "Comment on COP-73 asking Jonas which two signatures are still missing.",
      toolLabel: "Add Linear comment",
      surface: "linear",
    },
  ]
}

function triageSteps(): Step[] {
  return [
    { kind: "start" },
    { kind: "think", ms: 2_300, input: 4_800, output: 170, actions: 1 },
    { kind: "tool", tool: "linear_get_issue", ms: 500, target: "COP-88" },
    { kind: "think", ms: 3_400, input: 7_900, output: 360, actions: 1 },
    {
      kind: "tool",
      tool: "linear_add_comment",
      ms: 600,
      target: "COP-88",
      outcome: "comment added",
    },
    { kind: "think", ms: 1_800, input: 8_300, output: 70, actions: 0 },
    { kind: "end", status: "completed" },
  ]
}

function vendorSteps(): Step[] {
  return [
    { kind: "start" },
    { kind: "think", ms: 2_100, input: 3_600, output: 120, actions: 1 },
    {
      kind: "tool",
      tool: "conversations_replies",
      ms: 800,
      target: "#finance",
      outcome: "12 messages",
    },
    { kind: "think", ms: 3_800, input: 8_400, output: 390, actions: 0 },
    { kind: "end", status: "completed" },
  ]
}

function watchSteps(): Step[] {
  return [
    { kind: "start" },
    { kind: "think", ms: 2_700, input: 4_100, output: 160, actions: 1 },
    {
      kind: "tool",
      tool: "list_table_rows",
      ms: 400,
      target: "Customer renewals",
      outcome: "3 rows",
    },
    { kind: "think", ms: 3_100, input: 6_800, output: 140, actions: 0 },
    { kind: "end", status: "completed" },
  ]
}

function competitorSteps(): Step[] {
  return [
    { kind: "start" },
    { kind: "think", ms: 2_500, input: 4_400, output: 180, actions: 1 },
    {
      kind: "tool",
      tool: "list_table_rows",
      ms: 300,
      target: "Competitor moves",
      outcome: "3 rows",
    },
    { kind: "think", ms: 2_900, input: 6_100, output: 240, actions: 3 },
    {
      kind: "end",
      status: "failed",
      note: "Web fetch failed: https://northwind.example/pricing timed out after 30s.",
    },
  ]
}

function digestSteps(): Step[] {
  return [
    { kind: "start" },
    { kind: "think", ms: 2_800, input: 5_000, output: 200, actions: 1 },
    {
      kind: "tool",
      tool: "linear_list_comments",
      ms: 900,
      target: "Design",
      outcome: "18 comments",
    },
    { kind: "end", status: "stopped", note: "Stopped by Hanna Ek" },
  ]
}

function releaseSteps(): Step[] {
  return [
    { kind: "start" },
    { kind: "think", ms: 3_300, input: 5_900, output: 210, actions: 2 },
    {
      kind: "tool",
      tool: "github_search_issues",
      ms: 1_400,
      target: "copperline/payroll",
      outcome: "17 pull requests",
    },
    {
      kind: "tool",
      tool: "linear_search_issues",
      ms: 900,
      target: "Copperline",
      outcome: "9 issues",
    },
    { kind: "think", ms: 9_800, input: 21_400, output: 1_800, actions: 1 },
    {
      kind: "tool",
      tool: "conversations_add_message",
      ms: 600,
      target: "#eng",
    },
    { kind: "think", ms: 2_000, input: 23_500, output: 90, actions: 0 },
    { kind: "end", status: "completed" },
  ]
}
