type AutomationCommentEventAction = "created" | "edited"

export const issueCommentEvent = {
  created: "issue.comment.created",
  edited: "issue.comment.edited",
} as const

export const pullRequestCommentEvent = {
  created: "pull_request.comment.created",
  edited: "pull_request.comment.edited",
} as const

export const pullRequestReviewCommentEvent = {
  created: "pull_request.review_comment.created",
  edited: "pull_request.review_comment.edited",
} as const

export function githubCommentEventAction(
  action: string | undefined
): AutomationCommentEventAction | undefined {
  if (action === undefined || action === "created") {
    return "created"
  }

  return action === "edited" ? "edited" : undefined
}

export function linearCommentEventAction(
  action: string | undefined
): AutomationCommentEventAction | undefined {
  if (action === undefined || action === "create") {
    return "created"
  }

  return action === "update" ? "edited" : undefined
}

export function linearIssueCommentEvent(action: string | undefined) {
  const eventAction = linearCommentEventAction(action)

  return eventAction === undefined ? undefined : issueCommentEvent[eventAction]
}

export function isLinearIssueCommentEvent(event: string) {
  return (
    event === issueCommentEvent.created || event === issueCommentEvent.edited
  )
}

// Lifecycle events feed deduction; providers keep their native verbs.

export const issueLifecycleEvent = {
  opened: "issue.opened",
  closed: "issue.closed",
  reopened: "issue.reopened",
} as const

export const pullRequestLifecycleEvent = {
  opened: "pull_request.opened",
  closed: "pull_request.closed",
  merged: "pull_request.merged",
  reopened: "pull_request.reopened",
} as const

export const commitLifecycleEvent = {
  pushed: "commits.pushed",
} as const

export const linearIssueLifecycleEvent = {
  created: "issue.created",
  stateChanged: "issue.state_changed",
  removed: "issue.removed",
} as const

export const linearProjectLifecycleEvent = {
  created: "project.created",
  stateChanged: "project.state_changed",
  removed: "project.removed",
} as const
