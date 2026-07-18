import {
  booleanField,
  type JsonSchema,
  listField,
  numberField,
  resultSchema,
  stringField,
} from "../common"

// GitHub results are shaped by Milo's broker: raw GitHub payloads are
// summarized into compact objects whose undefined fields are dropped, so
// every field here is optional unless the broker itself constructs it.

export function repositorySummary(): JsonSchema {
  return resultSchema({
    description: "Compact repository summary; absent fields are omitted.",
    properties: {
      id: numberField("GitHub repository ID."),
      fullName: stringField("owner/name form."),
      private: booleanField("True for private repositories."),
      description: stringField("Repository description."),
      defaultBranch: stringField("Default branch name."),
      htmlUrl: stringField("Repository page URL."),
      updatedAt: stringField("Last update timestamp."),
    },
  })
}

export function issueSummary(): JsonSchema {
  return resultSchema({
    description: "Compact issue summary; absent fields are omitted.",
    properties: {
      id: numberField("GitHub issue ID."),
      number: numberField("Issue number."),
      title: stringField("Issue title."),
      body: stringField("Issue body in GitHub-flavored Markdown."),
      state: stringField("open or closed."),
      htmlUrl: stringField("Issue page URL."),
      pullRequest: booleanField("True when the issue is a pull request."),
      author: stringField("Author login."),
      assignees: listField("Assignee logins.", { type: "string" }),
      labels: listField("Label names.", { type: "string" }),
      createdAt: stringField("Creation timestamp."),
      updatedAt: stringField("Last update timestamp."),
    },
  })
}

export function pullRequestSummary(): JsonSchema {
  return resultSchema({
    description: "Compact pull request summary; absent fields are omitted.",
    properties: {
      id: numberField("GitHub pull request ID."),
      number: numberField("Pull request number."),
      title: stringField("Pull request title."),
      body: stringField("Pull request body."),
      state: stringField("open or closed."),
      draft: booleanField("True for draft pull requests."),
      merged: booleanField("True once merged."),
      mergeable: {
        type: ["boolean", "null"],
        description: "GitHub's mergeability check.",
      },
      htmlUrl: stringField("Pull request page URL."),
      author: stringField("Author login."),
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
      additions: numberField("Added line count."),
      deletions: numberField("Deleted line count."),
      changedFiles: numberField("Changed file count."),
      createdAt: stringField("Creation timestamp."),
      updatedAt: stringField("Last update timestamp."),
    },
  })
}

export function commentSummary(
  extra: Record<string, unknown> = {}
): JsonSchema {
  return resultSchema({
    description: "Compact comment summary; absent fields are omitted.",
    properties: {
      id: numberField("GitHub comment ID."),
      body: stringField("Comment body."),
      htmlUrl: stringField("Comment page URL."),
      author: stringField("Author login."),
      createdAt: stringField("Creation timestamp."),
      updatedAt: stringField("Last update timestamp."),
      ...extra,
    },
  })
}

export function reviewCommentSummary(): JsonSchema {
  return commentSummary({
    commitId: stringField("Commit the comment was left on."),
    diffHunk: stringField("Diff hunk the comment anchors to."),
    inReplyToId: numberField("Parent review comment ID for replies."),
    line: numberField("Current diff line."),
    originalLine: numberField("Original diff line."),
    path: stringField("File path the comment is on."),
    pullRequestReviewId: numberField("Review the comment belongs to."),
    side: stringField("LEFT or RIGHT diff side."),
  })
}

export function commitSummary(): JsonSchema {
  return resultSchema({
    description: "The commit Milo created.",
    properties: {
      baseSha: stringField("Base commit SHA for new branches."),
      files: listField("Repository-relative committed paths.", {
        type: "string",
      }),
      sha: stringField("New commit SHA."),
      treeSha: stringField("New tree SHA."),
    },
  })
}
