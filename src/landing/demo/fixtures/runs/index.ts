import { makeApproval } from "@/shared/console/runs/fixtures"
import { type ExecutionItem } from "@/shared/console/runs/types"
import { hour, minute } from "../clock"
import { demoId } from "../ids"
import { detail, mention, run, tools } from "./details"
import { chaseRun, scheduledRuns } from "./scheduled"

// Copperline's recent runs, as the Activity page lists them: every field a
// row or its detail reads is filled in, so the same views draw them the
// way they draw the console's own.

export const chaseRunId = demoId("runs", "chase")

export function demoRuns(now: number): ExecutionItem[] {
  return [
    chaseRun(now),
    harborRun(now),
    payrollRun(now),
    tipRun(now),
    triageRun(now),
    vendorRun(now),
    ...scheduledRuns(now),
  ]
}

/** The run behind the hero's thread. */
function harborRun(now: number) {
  return run(now, {
    id: "harbor",
    title: "Add Harbor House to the renewals table",
    task: "@jori add Harbor House to the renewals table, Sep 24, and flag it at risk.",
    result:
      "Done. One row added, marked at risk. Renewals watch will keep it current.",
    startedAgo: 3 * minute,
    durationMs: 14_000,
    source: mention(
      "slack",
      "https://copperline.slack.com/archives/C04FIN/p1725260000"
    ),
    details: [
      detail("channel", "#finance"),
      tools([["jori", ["list_table_rows", "insert_table_row"]]]),
    ],
  })
}

/** Still going: the row with the stop control. */
function payrollRun(now: number) {
  return run(now, {
    id: "payroll",
    title: "Payroll sync test is flaky on CI",
    task: "@jori can you find why this keeps failing and fix it?",
    status: "running",
    startedAgo: 4 * minute,
    source: mention(
      "github",
      "https://github.com/copperline/payroll/issues/491"
    ),
    details: [
      detail(
        "repository",
        "copperline/payroll",
        "https://github.com/copperline/payroll"
      ),
      detail(
        "issue",
        "#491 Payroll sync test is flaky on CI",
        "https://github.com/copperline/payroll/issues/491"
      ),
      tools([
        [
          "github",
          [
            "github_get_issue",
            "github_get_file",
            "github_clone_repository",
            "github_add_issue_comment",
          ],
        ],
      ]),
    ],
  })
}

/** Waiting on someone: the row with Approve and Deny. */
function tipRun(now: number) {
  return run(now, {
    id: "tip",
    title: "Tip-pooling certification",
    task: "@jori what's left before this ships?",
    status: "running",
    startedAgo: 9 * minute,
    source: mention("linear", "https://linear.app/copperline/issue/COP-73"),
    details: [
      detail(
        "issue",
        "COP-73 Tip-pooling certification",
        "https://linear.app/copperline/issue/COP-73"
      ),
      detail("project", "Copperline"),
      tools([
        [
          "linear",
          ["linear_get_issue", "linear_list_comments", "linear_add_comment"],
        ],
      ]),
    ],
    approval: makeApproval({
      id: demoId("approvals", "tip"),
      decidedAt: undefined,
      expiresAt: now + 27 * minute,
      state: "pending",
      summary:
        "Comment on COP-73 asking Jonas which two signatures are still missing.",
      surface: "linear",
      tool: "linear_add_comment",
      toolLabel: "Add Linear comment",
    }),
  })
}

function triageRun(now: number) {
  return run(now, {
    id: "triage",
    title: "Ticket triage",
    task: "Triage COP-88 from the report in the thread.",
    result: "Labeled bug, priority high, assigned to Ravi Menon.",
    startedAgo: 26 * minute,
    durationMs: 22_000,
    source: {
      type: "event",
      surface: "linear",
      event: { type: "issue.comment.created", label: "Issue comment" },
    },
    details: [
      detail(
        "issue",
        "COP-88 Export hangs on large tables",
        "https://linear.app/copperline/issue/COP-88"
      ),
      detail("folder", "Engineering"),
      tools([["linear", ["linear_get_issue", "linear_add_comment"]]]),
    ],
  })
}

function vendorRun(now: number) {
  return run(now, {
    id: "vendor",
    title: "Summarize the vendor thread",
    task: "@jori summarize this thread and list what we still owe.",
    result:
      "Two invoices open: Pixelmill Studio ($4,200, due Sep 12) and Ferrous Print ($640, due Sep 19).",
    audience: "personal",
    startedAgo: hour,
    durationMs: 9_000,
    source: mention(
      "slack",
      "https://copperline.slack.com/archives/D07MAYA/p1725255000"
    ),
    details: [
      tools([["slack", ["conversations_history", "conversations_replies"]]]),
    ],
  })
}
