import {
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringArrayProperty,
  stringProperty,
} from "./common"
import {
  githubCommentReactionSubjectProperty,
  githubReactionContentProperty,
  githubReactionTargetProperty,
} from "./reactions"
import { sourceChangesProperty } from "./source"

export const githubToolInputSchemas = {
  github_list_repositories: objectSchema({
    properties: {
      page: numberProperty("GitHub results page.", 1, 100),
      perPage: numberProperty("Repositories per page.", 1, 100),
    },
  }),
  github_get_repository: repositorySchema(),
  github_search_issues: objectSchema({
    required: ["query"],
    properties: {
      owner: stringProperty("Optional repository owner to scope the search."),
      page: numberProperty("GitHub results page.", 1, 100),
      perPage: numberProperty("Items per page.", 1, 100),
      query: stringProperty("GitHub issue search query."),
      repo: stringProperty("Optional repository name to scope the search."),
      state: {
        type: "string",
        enum: ["open", "closed"],
        description: "Optional issue or pull request state.",
      },
    },
  }),
  github_get_issue: objectSchema({
    required: ["owner", "repo", "issueNumber"],
    properties: {
      comments: numberProperty("Number of issue comments to include.", 0, 100),
      issueNumber: numberProperty("Issue number.", 1),
      owner: stringProperty("Repository owner."),
      repo: stringProperty("Repository name."),
    },
  }),
  github_get_pull_request: objectSchema({
    required: ["owner", "repo", "pullNumber"],
    properties: {
      owner: stringProperty("Repository owner."),
      pullNumber: numberProperty("Pull request number.", 1),
      repo: stringProperty("Repository name."),
    },
  }),
  github_get_file: objectSchema({
    required: ["owner", "repo", "path"],
    properties: {
      owner: stringProperty("Repository owner."),
      path: stringProperty("File or directory path in the repository."),
      ref: stringProperty("Branch, tag, or commit SHA."),
      repo: stringProperty("Repository name."),
    },
  }),
  github_clone_repository: objectSchema({
    required: ["owner", "repo"],
    properties: {
      directory: stringProperty(
        "Empty workspace-relative destination directory for the Git working copy. Omit to clone into /home/user/workspace/<repo>."
      ),
      owner: stringProperty("Repository owner."),
      ref: stringProperty("Branch, tag, or commit SHA."),
      repo: stringProperty("Repository name."),
    },
  }),
  github_add_issue_comment: objectSchema({
    required: ["owner", "repo", "issueNumber", "body"],
    properties: {
      body: stringProperty("GitHub-flavored Markdown comment body."),
      issueNumber: numberProperty(
        "Issue number. For pull requests, use the pull request number.",
        1
      ),
      owner: stringProperty("Repository owner."),
      repo: stringProperty("Repository name."),
    },
  }),
  github_reply_to_pull_request_review_comment: objectSchema({
    required: ["owner", "repo", "pullNumber", "commentId", "body"],
    properties: {
      body: stringProperty("GitHub-flavored Markdown reply body."),
      commentId: numberProperty("Top-level pull request review comment ID.", 1),
      owner: stringProperty("Repository owner."),
      pullNumber: numberProperty("Pull request number.", 1),
      repo: stringProperty("Repository name."),
    },
  }),
  github_add_reaction: objectSchema({
    required: ["owner", "repo", "target", "content"],
    properties: {
      content: githubReactionContentProperty("GitHub reaction content to add."),
      owner: stringProperty("Repository owner."),
      repo: stringProperty("Repository name."),
      target: githubReactionTargetProperty(),
    },
  }),
  github_list_pull_request_files: pullRequestPageSchema(
    "Pull request changed files page."
  ),
  github_list_pull_request_review_comments: pullRequestPageSchema(
    "Pull request review comments page."
  ),
  github_commit_to_pull_request: objectSchema({
    required: ["owner", "repo", "pullNumber", "commitMessage"],
    properties: {
      changes: sourceChangesProperty(),
      commitMessage: stringProperty("Commit message for the new PR commit."),
      directory: stringProperty(
        "Workspace-relative cloned repository directory. Omit to use /home/user/workspace/<repo>."
      ),
      owner: stringProperty("Repository owner."),
      paths: stringArrayProperty(
        "Optional repository-relative paths to include in the commit."
      ),
      pullNumber: numberProperty("Pull request number.", 1),
      repo: stringProperty("Repository name."),
    },
  }),
  github_create_pull_request: objectSchema({
    required: ["owner", "repo", "title"],
    properties: {
      base: stringProperty(
        "Base branch. Omit to use the repository default branch."
      ),
      body: stringProperty("GitHub-flavored Markdown pull request body."),
      branch: stringProperty(
        "New branch name when creating a PR from local source changes. Omit to use a Milo-generated branch."
      ),
      changes: sourceChangesProperty(),
      commitMessage: stringProperty(
        "Commit message for local source changes. Omit to use the PR title."
      ),
      directory: stringProperty(
        "Workspace-relative cloned repository directory. Omit to use /home/user/workspace/<repo>."
      ),
      draft: booleanProperty("Create the pull request as a draft."),
      head: stringProperty(
        "Existing head branch to open a PR from. Omit when creating a PR from local source changes."
      ),
      maintainerCanModify: booleanProperty(
        "Allow maintainers to modify the pull request branch."
      ),
      owner: stringProperty("Repository owner."),
      paths: stringArrayProperty(
        "Optional repository-relative paths to include when creating a commit from local changes."
      ),
      repo: stringProperty("Repository name."),
      title: stringProperty("Pull request title."),
    },
  }),
  github_add_comment_reaction: objectSchema({
    required: ["owner", "repo", "commentId", "subject", "content"],
    properties: {
      commentId: numberProperty("GitHub comment ID.", 1),
      content: githubReactionContentProperty("GitHub reaction content."),
      owner: stringProperty("Repository owner."),
      repo: stringProperty("Repository name."),
      subject: githubCommentReactionSubjectProperty(),
    },
  }),
  github_update_pull_request: objectSchema({
    required: ["owner", "repo", "pullNumber"],
    properties: {
      base: stringProperty("New base branch."),
      body: stringProperty("Updated GitHub-flavored Markdown body."),
      maintainerCanModify: booleanProperty(
        "Allow maintainers to modify the pull request branch."
      ),
      owner: stringProperty("Repository owner."),
      pullNumber: numberProperty("Pull request number.", 1),
      repo: stringProperty("Repository name."),
      state: {
        type: "string",
        enum: ["open", "closed"],
        description: "Updated pull request state.",
      },
      title: stringProperty("Updated pull request title."),
    },
  }),
} satisfies SchemaMap

function repositorySchema() {
  return objectSchema({
    required: ["owner", "repo"],
    properties: {
      owner: stringProperty("Repository owner."),
      repo: stringProperty("Repository name."),
    },
  })
}

function pullRequestPageSchema(description: string) {
  return objectSchema({
    required: ["owner", "repo", "pullNumber"],
    properties: {
      owner: stringProperty("Repository owner."),
      page: numberProperty(description, 1, 100),
      perPage: numberProperty("Items per page.", 1, 100),
      pullNumber: numberProperty("Pull request number.", 1),
      repo: stringProperty("Repository name."),
    },
  })
}

function booleanProperty(description: string) {
  return { type: "boolean", description }
}
