import { type ToolPermissionRow } from "./index"

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
    "Clone a GitHub repository into /home/user/workspace/<repo> as a real Git working copy. Use this instead of git clone in bash.",
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
  [
    "github",
    "github_reply_to_pull_request_review_comment",
    "Reply to review comment",
    "Post a reply to an inline GitHub pull request review comment.",
    "write",
    "required",
  ],
] satisfies ToolPermissionRow[]
