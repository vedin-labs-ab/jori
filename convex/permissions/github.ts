import { type ToolPermissionRow } from "./catalog"

export const githubToolPermissionRows = [
  [
    "github",
    "github_list_repositories",
    "List repositories",
    "List repositories available to the GitHub installation.",
    "read",
  ],
  [
    "github",
    "github_get_repository",
    "Read repository",
    "Read GitHub repository metadata.",
    "read",
  ],
  [
    "github",
    "github_search_issues",
    "Search issues and PRs",
    "Search GitHub issues and pull requests.",
    "read",
  ],
  [
    "github",
    "github_get_issue",
    "Read issue",
    "Read a GitHub issue or pull request conversation.",
    "read",
  ],
  [
    "github",
    "github_get_pull_request",
    "Read pull request",
    "Read GitHub pull request metadata.",
    "read",
  ],
  [
    "github",
    "github_get_file",
    "Read file",
    "Read a GitHub repository file or directory.",
    "read",
  ],
  [
    "github",
    "github_clone_repository",
    "Clone repository",
    "Clone a GitHub repository into the sandbox.",
    "read",
  ],
  [
    "github",
    "github_add_issue_comment",
    "Add issue comment",
    "Post a GitHub issue or pull request comment.",
    "write",
    "required",
  ],
] satisfies ToolPermissionRow[]
