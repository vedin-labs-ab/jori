import {
  type GitHubComment,
  type GitHubPullRequest,
  type GitHubRepository,
  type GitHubWebhookPayload,
} from "./types"

export function getGitHubMessage(args: {
  event: string | null
  payload: GitHubWebhookPayload
  deliveryId: string | null
}) {
  const installationId = args.payload.installation?.id

  if (installationId === undefined) {
    return null
  }

  if (args.event === "issue_comment") {
    return getIssueCommentMessage(args.payload, installationId, args.deliveryId)
  }

  if (args.event === "pull_request_review_comment") {
    return getPullRequestReviewCommentMessage(
      args.payload,
      installationId,
      args.deliveryId
    )
  }

  return null
}

function getIssueCommentMessage(
  payload: GitHubWebhookPayload,
  installationId: number,
  deliveryId: string | null
) {
  if (!isRelevantCommentAction(payload.action)) {
    return null
  }

  const repository = parseRepository(payload.repository)
  const issue = payload.issue
  const comment = payload.comment

  if (
    repository === null ||
    issue?.number === undefined ||
    comment?.id === undefined
  ) {
    return null
  }

  const isPullRequest = issue.pull_request !== undefined

  return {
    accountId: String(installationId),
    type: isPullRequest
      ? `comment.pull_request.${payload.action ?? "created"}`
      : `comment.issue.${payload.action ?? "created"}`,
    externalId: createGitHubExternalId(installationId, deliveryId, comment.id),
    actorId: getSenderId(payload),
    conversationId: `${repository.fullName}#${issue.number}`,
    text: comment.body,
    observedAt: getObservedAt(comment.updated_at ?? comment.created_at),
    data: {
      action: payload.action,
      eventType: "issue_comment",
      deliveryId,
      repository,
      issueNumber: issue.number,
      pullNumber: isPullRequest ? issue.number : undefined,
      isPullRequest,
      issue: {
        id: issue.id,
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
      },
      comment: {
        id: String(comment.id),
        nodeId: comment.node_id,
        url: comment.html_url,
        apiUrl: comment.url,
        kind: isPullRequest ? "pull_request_conversation" : "issue",
      },
      sender: payload.sender,
    },
  }
}

function getPullRequestReviewCommentMessage(
  payload: GitHubWebhookPayload,
  installationId: number,
  deliveryId: string | null
) {
  if (!isRelevantCommentAction(payload.action)) {
    return null
  }

  const repository = parseRepository(payload.repository)
  const pullRequest = payload.pull_request
  const comment = payload.comment

  if (
    repository === null ||
    pullRequest?.number === undefined ||
    comment?.id === undefined
  ) {
    return null
  }

  return {
    accountId: String(installationId),
    type: `comment.pull_request_review.${payload.action ?? "created"}`,
    externalId: createGitHubExternalId(installationId, deliveryId, comment.id),
    actorId: getSenderId(payload),
    conversationId: `${repository.fullName}#${pullRequest.number}`,
    text: comment.body,
    observedAt: getObservedAt(comment.updated_at ?? comment.created_at),
    data: {
      action: payload.action,
      eventType: "pull_request_review_comment",
      deliveryId,
      repository,
      pullNumber: pullRequest.number,
      isPullRequest: true,
      pullRequest: getPullRequestData(pullRequest),
      comment: getReviewCommentData(comment),
      sender: payload.sender,
    },
  }
}

function getPullRequestData(pullRequest: GitHubPullRequest) {
  return {
    id: pullRequest.id,
    number: pullRequest.number,
    title: pullRequest.title,
    url: pullRequest.html_url,
    head: pullRequest.head,
    base: pullRequest.base,
  }
}

function getReviewCommentData(comment: GitHubComment) {
  return {
    id: String(comment.id),
    nodeId: comment.node_id,
    url: comment.html_url,
    apiUrl: comment.url,
    kind: "pull_request_review",
    path: comment.path,
    line: comment.line,
    side: comment.side,
    commitId: comment.commit_id,
    inReplyToId:
      comment.in_reply_to_id === undefined
        ? undefined
        : String(comment.in_reply_to_id),
    reviewId:
      comment.pull_request_review_id === undefined
        ? undefined
        : String(comment.pull_request_review_id),
  }
}

function parseRepository(repository: GitHubRepository | undefined) {
  if (
    repository?.owner?.login === undefined ||
    repository.name === undefined ||
    repository.full_name === undefined
  ) {
    return null
  }

  return {
    id: repository.id,
    owner: repository.owner.login,
    name: repository.name,
    fullName: repository.full_name,
    url: repository.html_url,
    cloneUrl: repository.clone_url,
    defaultBranch: repository.default_branch,
  }
}

function isRelevantCommentAction(action: string | undefined) {
  return action === undefined || action === "created" || action === "edited"
}

function createGitHubExternalId(
  installationId: number,
  deliveryId: string | null,
  commentId: number
) {
  return `github:${installationId}:${deliveryId ?? commentId}`
}

function getSenderId(payload: GitHubWebhookPayload) {
  if (payload.sender?.id === undefined) {
    return undefined
  }

  return String(payload.sender.id)
}

function getObservedAt(timestamp: string | undefined) {
  if (timestamp === undefined) {
    return undefined
  }

  const value = Date.parse(timestamp)

  return Number.isFinite(value) ? value : undefined
}
