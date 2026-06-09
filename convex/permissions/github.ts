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
    "github_get_file",
    "Read file",
    "Read a GitHub repository file or directory.",
    "read",
  ],
  [
    "github",
    "github_get_trigger_context",
    "Read trigger context",
    "Read the GitHub item that triggered the run.",
    "read",
  ],
  [
    "github",
    "github_request",
    "GitHub API request",
    "Call the GitHub repository API.",
    "write",
  ],
  [
    "github",
    "github_clone_repository",
    "Clone repository",
    "Clone the triggering repository into the sandbox.",
    "read",
  ],
  [
    "github",
    "github_reply",
    "Reply on GitHub",
    "Post a GitHub issue or pull request reply.",
    "write",
    "required",
  ],
] satisfies ToolPermissionRow[]
