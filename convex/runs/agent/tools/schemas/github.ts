import {
  numberProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "./common"

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
