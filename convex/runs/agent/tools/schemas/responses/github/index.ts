import {
  booleanField,
  listField,
  numberField,
  providerPayload,
  resultSchema,
  type SchemaMap,
  stringField,
} from "../common"
import {
  commentSummary,
  commitSummary,
  issueSummary,
  pullRequestSummary,
  repositorySummary,
  reviewCommentSummary,
} from "./summaries"

export const githubToolResponseSchemas = {
  github_list_repositories: resultSchema({
    required: ["totalCount", "repositories"],
    properties: {
      totalCount: numberField("Repositories the installation can reach."),
      repositories: listField("One page of summaries.", repositorySummary()),
    },
  }),
  github_get_repository: repositorySummary(),
  github_search_issues: resultSchema({
    required: ["totalCount", "items"],
    properties: {
      totalCount: numberField("Total matches GitHub reports."),
      items: listField(
        "One page of matches.",
        resultSchema({
          properties: {
            title: stringField("Issue or pull request title."),
            number: numberField("Issue or pull request number."),
            state: stringField("open or closed."),
            repositoryUrl: stringField("API URL of the repository."),
            htmlUrl: stringField("Item page URL."),
            pullRequest: booleanField("True for pull requests."),
            updatedAt: stringField("Last update timestamp."),
            user: stringField("Author login."),
          },
        })
      ),
    },
  }),
  github_get_issue: resultSchema({
    required: ["issue", "comments"],
    properties: {
      issue: issueSummary(),
      comments: listField("Issue comments, oldest first.", commentSummary()),
    },
  }),
  github_get_pull_request: pullRequestSummary(),
  github_get_file: {
    description:
      "A file with decoded content, a directory listing, or GitHub's raw content object for other types like submodules.",
    oneOf: [
      resultSchema({
        required: ["name", "path", "content"],
        properties: {
          name: stringField("File name."),
          path: stringField("Repository-relative path."),
          sha: stringField("Blob SHA."),
          size: numberField("File size in bytes."),
          htmlUrl: stringField("File page URL."),
          truncated: booleanField(
            "True when content exceeded 100,000 characters."
          ),
          content: stringField(
            "Decoded file content, up to 100,000 characters."
          ),
        },
      }),
      resultSchema({
        required: ["type", "entries"],
        properties: {
          type: { type: "string", const: "directory" },
          entries: listField(
            "Directory entries.",
            resultSchema({
              properties: {
                name: stringField("Entry name."),
                path: stringField("Repository-relative path."),
                type: stringField("file, dir, or symlink."),
                size: numberField("Size in bytes."),
                htmlUrl: stringField("Entry page URL."),
              },
            })
          ),
        },
      }),
      providerPayload(
        "GitHub's contents object for non-file, non-directory types, unchanged."
      ),
    ],
  },
  github_clone_repository: resultSchema({
    required: ["directory", "git", "remoteUrl", "repository"],
    description: "The clone Milo materialized into the sandbox workspace.",
    properties: {
      directory: stringField("Workspace path of the Git working copy."),
      git: { type: "boolean", const: true },
      ref: stringField("Checked-out branch, tag, or commit, when given."),
      remoteUrl: stringField("HTTPS remote URL."),
      repository: stringField("owner/name form."),
    },
  }),
  github_add_issue_comment: commentSummary(),
  github_reply_to_pull_request_review_comment: commentSummary(),
  github_list_pull_request_files: resultSchema({
    required: ["files"],
    properties: {
      files: listField(
        "One page of changed files.",
        resultSchema({
          properties: {
            additions: numberField("Added line count."),
            blobUrl: stringField("Blob page URL."),
            changes: numberField("Changed line count."),
            deletions: numberField("Deleted line count."),
            filename: stringField("Repository-relative path."),
            previousFilename: stringField("Previous path for renames."),
            rawUrl: stringField("Raw content URL."),
            sha: stringField("Blob SHA."),
            status: stringField("added, modified, removed, or renamed."),
          },
        })
      ),
    },
  }),
  github_list_pull_request_review_comments: resultSchema({
    required: ["comments"],
    properties: {
      comments: listField(
        "One page of review comments.",
        reviewCommentSummary()
      ),
    },
  }),
  github_commit_to_pull_request: resultSchema({
    required: ["changes", "commit", "pullRequest"],
    properties: {
      changes: resultSchema({
        properties: {
          files: listField("Committed repository-relative paths.", {
            type: "string",
          }),
          headSha: stringField("Head SHA the commit was based on."),
        },
      }),
      commit: commitSummary(),
      pullRequest: pullRequestSummary(),
    },
  }),
  github_create_pull_request: resultSchema({
    required: ["pullRequest"],
    properties: {
      commit: commitSummary(),
      pullRequest: pullRequestSummary(),
    },
  }),
  github_add_comment_reaction: resultSchema({
    description: "Compact reaction summary; absent fields are omitted.",
    properties: {
      content: stringField("Reaction keyword."),
      createdAt: stringField("Creation timestamp."),
      id: numberField("GitHub reaction ID."),
      user: stringField("Reacting user login."),
    },
  }),
  github_update_pull_request: pullRequestSummary(),
} satisfies SchemaMap
