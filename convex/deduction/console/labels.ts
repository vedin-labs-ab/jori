import { type BeliefStatus } from "../schema"

// User-facing display strings for deduction internals. Internal keys keep
// their implementation names; only display copy lives here.

export const statusLabels: Record<BeliefStatus, string> = {
  proposed: "Suggested",
  confirmed: "Confirmed",
  closed: "Archived",
  rejected: "Not a workstream",
}

const eventKinds: Record<string, string> = {
  "commits.pushed": "Default branch push",
  "issue.created": "Issue created",
  "issue.opened": "Issue opened",
  "issue.closed": "Issue closed",
  "issue.reopened": "Issue reopened",
  "issue.state_changed": "Issue updated",
  "issue.removed": "Issue removed",
  "issue.comment.created": "Issue comment",
  "issue.comment.edited": "Issue comment",
  "pull_request.opened": "Pull request opened",
  "pull_request.merged": "Pull request merged",
  "pull_request.closed": "Pull request closed",
  "pull_request.reopened": "Pull request reopened",
  "pull_request.comment.created": "Pull request comment",
  "pull_request.comment.edited": "Pull request comment",
  "pull_request.review_comment.created": "Review comment",
  "pull_request.review_comment.edited": "Review comment",
  "project.created": "Project created",
  "project.state_changed": "Project updated",
  "project.removed": "Project removed",
  "message.created": "Message",
}

// Unknown types fall back to readable words so new events degrade gracefully.
export function eventKindLabel(type: string) {
  const label = eventKinds[type]

  if (label !== undefined) {
    return label
  }

  const words = type.replaceAll(/[._]/g, " ").trim()

  return words === "" ? "Activity" : words[0]?.toUpperCase() + words.slice(1)
}
