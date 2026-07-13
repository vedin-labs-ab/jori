import { readArray, readNested, readRecord } from "../../../shared/input"

export function summarizeRepository(repository: Record<string, unknown>) {
  return compactGitHubSummary({
    id: repository.id,
    fullName: repository.full_name,
    private: repository.private,
    description: repository.description,
    defaultBranch: repository.default_branch,
    htmlUrl: repository.html_url,
    updatedAt: repository.updated_at,
  })
}

export function summarizeIssue(issue: Record<string, unknown>) {
  return compactGitHubSummary({
    id: issue.id,
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    htmlUrl: issue.html_url,
    pullRequest: issue.pull_request !== undefined,
    author: readNested(issue, "user", "login"),
    assignees: readArray(issue.assignees).map((user) => readRecord(user).login),
    labels: readArray(issue.labels).map((label) =>
      typeof label === "string" ? label : readRecord(label).name
    ),
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
  })
}

export function summarizePullRequest(pullRequest: Record<string, unknown>) {
  return compactGitHubSummary({
    id: pullRequest.id,
    number: pullRequest.number,
    title: pullRequest.title,
    body: pullRequest.body,
    state: pullRequest.state,
    draft: pullRequest.draft,
    merged: pullRequest.merged,
    mergeable: pullRequest.mergeable,
    htmlUrl: pullRequest.html_url,
    author: readNested(pullRequest, "user", "login"),
    base: readNested(pullRequest, "base"),
    head: readNested(pullRequest, "head"),
    additions: pullRequest.additions,
    deletions: pullRequest.deletions,
    changedFiles: pullRequest.changed_files,
    createdAt: pullRequest.created_at,
    updatedAt: pullRequest.updated_at,
  })
}

export function summarizeComment(comment: Record<string, unknown>) {
  return compactGitHubSummary({
    id: comment.id,
    body: comment.body,
    htmlUrl: comment.html_url,
    author: readNested(comment, "user", "login"),
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  })
}

export function compactGitHubSummary(summary: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(summary).filter(([, value]) => value !== undefined)
  )
}
