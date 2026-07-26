import {
  arrayProperty,
  booleanProperty,
  type JsonSchema,
  numberProperty,
  objectSchema,
  stringProperty,
} from "../common"

// GitHub results are shaped by Jori's broker: raw GitHub payloads are
// summarized into compact objects whose undefined fields are dropped, so
// every field here is optional unless the broker itself constructs it.

export function repositorySummary(): JsonSchema {
  return objectSchema({
    description: "Compact repository summary; absent fields are omitted.",
    properties: {
      id: numberProperty("GitHub repository ID."),
      fullName: stringProperty("owner/name form."),
      private: booleanProperty("True for private repositories."),
      description: stringProperty("Repository description."),
      defaultBranch: stringProperty("Default branch name."),
      htmlUrl: stringProperty("Repository page URL."),
      updatedAt: stringProperty("Last update timestamp."),
    },
  })
}

export function issueSummary(): JsonSchema {
  return objectSchema({
    description: "Compact issue summary; absent fields are omitted.",
    properties: {
      id: numberProperty("GitHub issue ID."),
      number: numberProperty("Issue number."),
      title: stringProperty("Issue title."),
      body: stringProperty("Issue body in GitHub-flavored Markdown."),
      state: stringProperty("open or closed."),
      htmlUrl: stringProperty("Issue page URL."),
      pullRequest: booleanProperty("True when the issue is a pull request."),
      author: stringProperty("Author login."),
      assignees: arrayProperty("Assignee logins.", { type: "string" }),
      labels: arrayProperty("Label names.", { type: "string" }),
      createdAt: stringProperty("Creation timestamp."),
      updatedAt: stringProperty("Last update timestamp."),
    },
  })
}

export function pullRequestSummary(): JsonSchema {
  return objectSchema({
    description: "Compact pull request summary; absent fields are omitted.",
    properties: {
      id: numberProperty("GitHub pull request ID."),
      number: numberProperty("Pull request number."),
      title: stringProperty("Pull request title."),
      body: stringProperty("Pull request body."),
      state: stringProperty("open or closed."),
      draft: booleanProperty("True for draft pull requests."),
      merged: booleanProperty("True once merged."),
      mergeable: {
        type: ["boolean", "null"],
        description: "GitHub's mergeability check.",
      },
      htmlUrl: stringProperty("Pull request page URL."),
      author: stringProperty("Author login."),
      base: {
        type: "object",
        additionalProperties: true,
        description: "Base branch ref object.",
      },
      head: {
        type: "object",
        additionalProperties: true,
        description: "Head branch ref object with ref and sha.",
      },
      additions: numberProperty("Added line count."),
      deletions: numberProperty("Deleted line count."),
      changedFiles: numberProperty("Changed file count."),
      createdAt: stringProperty("Creation timestamp."),
      updatedAt: stringProperty("Last update timestamp."),
    },
  })
}

export function commentSummary(
  extra: Record<string, unknown> = {}
): JsonSchema {
  return objectSchema({
    description: "Compact comment summary; absent fields are omitted.",
    properties: {
      id: numberProperty("GitHub comment ID."),
      body: stringProperty("Comment body."),
      htmlUrl: stringProperty("Comment page URL."),
      author: stringProperty("Author login."),
      createdAt: stringProperty("Creation timestamp."),
      updatedAt: stringProperty("Last update timestamp."),
      ...extra,
    },
  })
}

export function reviewCommentSummary(): JsonSchema {
  return commentSummary({
    commitId: stringProperty("Commit the comment was left on."),
    diffHunk: stringProperty("Diff hunk the comment anchors to."),
    inReplyToId: numberProperty("Parent review comment ID for replies."),
    line: numberProperty("Current diff line."),
    originalLine: numberProperty("Original diff line."),
    path: stringProperty("File path the comment is on."),
    pullRequestReviewId: numberProperty("Review the comment belongs to."),
    side: stringProperty("LEFT or RIGHT diff side."),
  })
}

export function commitSummary(): JsonSchema {
  return objectSchema({
    description: "The commit Jori created.",
    properties: {
      baseSha: stringProperty("Base commit SHA for new branches."),
      files: arrayProperty("Repository-relative committed paths.", {
        type: "string",
      }),
      sha: stringProperty("New commit SHA."),
      treeSha: stringProperty("New tree SHA."),
    },
  })
}
