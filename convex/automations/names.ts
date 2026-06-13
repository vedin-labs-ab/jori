export type AutomationCommentEventAction = "created" | "edited"

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
