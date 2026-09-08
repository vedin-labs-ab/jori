import {
  arrayProperty,
  booleanProperty,
  enumProperty,
  numberProperty,
  objectSchema,
  providerPayload,
  type SchemaMap,
  stringProperty,
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
  github_list_repositories: objectSchema({
    required: ["totalCount", "repositories"],
    properties: {
      totalCount: numberProperty("Repositories the installation can reach."),
      repositories: arrayProperty(
        "One page of summaries.",
        repositorySummary()
      ),
    },
  }),
  github_get_repository: repositorySummary(),
  github_search_issues: objectSchema({
    required: ["totalCount", "items"],
    properties: {
      totalCount: numberProperty("Total matches GitHub reports."),
      items: arrayProperty(
        "One page of matches.",
        objectSchema({
          properties: {
            title: stringProperty("Issue or pull request title."),
            number: numberProperty("Issue or pull request number."),
            state: stringProperty("open or closed."),
            repositoryUrl: stringProperty("API URL of the repository."),
            htmlUrl: stringProperty("Item page URL."),
            pullRequest: booleanProperty("True for pull requests."),
            updatedAt: stringProperty("Last update timestamp."),
            user: stringProperty("Author login."),
          },
        })
      ),
    },
  }),
  github_get_issue: objectSchema({
    required: ["issue", "comments"],
    properties: {
      issue: issueSummary(),
      comments: arrayProperty(
        "Issue comments, oldest first.",
        commentSummary()
      ),
    },
  }),
  github_get_pull_request: pullRequestSummary(),
  github_get_file: {
    description:
      "A file with decoded content, a directory listing, or GitHub's raw content object for other types like submodules.",
    oneOf: [
      objectSchema({
        required: ["name", "path", "content"],
        properties: {
          name: stringProperty("File name."),
          path: stringProperty("Repository-relative path."),
          sha: stringProperty("Blob SHA."),
          size: numberProperty("File size in bytes."),
          htmlUrl: stringProperty("File page URL."),
          truncated: booleanProperty(
            "True when content exceeded 100,000 characters."
          ),
          content: stringProperty(
            "Decoded file content, up to 100,000 characters."
          ),
        },
      }),
      objectSchema({
        required: ["type", "entries"],
        properties: {
          type: { type: "string", const: "directory" },
          entries: arrayProperty(
            "Directory entries.",
            objectSchema({
              properties: {
                name: stringProperty("Entry name."),
                path: stringProperty("Repository-relative path."),
                type: stringProperty("file, dir, or symlink."),
                size: numberProperty("Size in bytes."),
                htmlUrl: stringProperty("Entry page URL."),
              },
            })
          ),
        },
      }),
      {
        ...providerPayload(
          "GitHub's symlink or submodule contents object, unchanged."
        ),
        required: ["type", "name", "path"],
        properties: {
          type: enumProperty(["symlink", "submodule"], "GitHub content type."),
          name: stringProperty("Entry name."),
          path: stringProperty("Repository-relative path."),
        },
      },
    ],
  },
  github_clone_repository: objectSchema({
    required: ["directory", "git", "remoteUrl", "repository"],
    description: "The clone Jori materialized into the sandbox workspace.",
    properties: {
      directory: stringProperty("Workspace path of the Git working copy."),
      git: { type: "boolean", const: true },
      ref: stringProperty("Checked-out branch, tag, or commit, when given."),
      remoteUrl: stringProperty("HTTPS remote URL."),
      repository: stringProperty("owner/name form."),
    },
  }),
  github_add_issue_comment: commentSummary(),
  github_reply_to_pull_request_review_comment: commentSummary(),
  github_list_pull_request_files: objectSchema({
    required: ["files"],
    properties: {
      files: arrayProperty(
        "One page of changed files.",
        objectSchema({
          properties: {
            additions: numberProperty("Added line count."),
            blobUrl: stringProperty("Blob page URL."),
            changes: numberProperty("Changed line count."),
            deletions: numberProperty("Deleted line count."),
            filename: stringProperty("Repository-relative path."),
            previousFilename: stringProperty("Previous path for renames."),
            rawUrl: stringProperty("Raw content URL."),
            sha: stringProperty("Blob SHA."),
            status: stringProperty("added, modified, removed, or renamed."),
          },
        })
      ),
    },
  }),
  github_list_pull_request_review_comments: objectSchema({
    required: ["comments"],
    properties: {
      comments: arrayProperty(
        "One page of review comments.",
        reviewCommentSummary()
      ),
    },
  }),
  github_commit_to_pull_request: objectSchema({
    required: ["changes", "commit", "pullRequest"],
    properties: {
      changes: objectSchema({
        properties: {
          files: {
            type: "integer",
            minimum: 0,
            description: "Committed file count.",
          },
          headSha: stringProperty("Head SHA the commit was based on."),
        },
      }),
      commit: commitSummary(),
      pullRequest: pullRequestSummary(),
    },
  }),
  github_create_pull_request: objectSchema({
    required: ["pullRequest"],
    properties: {
      commit: commitSummary(),
      pullRequest: pullRequestSummary(),
    },
  }),
  github_add_comment_reaction: objectSchema({
    description: "Compact reaction summary; absent fields are omitted.",
    properties: {
      content: stringProperty("Reaction keyword."),
      createdAt: stringProperty("Creation timestamp."),
      id: numberProperty("GitHub reaction ID."),
      user: stringProperty("Reacting user login."),
    },
  }),
  github_update_pull_request: pullRequestSummary(),
} satisfies SchemaMap
