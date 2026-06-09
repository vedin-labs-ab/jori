---
name: github
description: Built-in GitHub skill for inspecting connected repositories and adding GitHub comments.
---

# GitHub

Use GitHub for connected repository context and GitHub comments.

Context:
- Use `github_list_repositories` when the user asks what GitHub repositories or
  projects are available.
- Use `github_get_repository`, `github_search_issues`, `github_get_issue`,
  `github_get_pull_request`, and `github_get_file` for focused repository,
  issue, pull request, and file lookup.
- Use repository owner, repository name, issue number, and pull request number
  from trigger context when they identify the relevant GitHub target.
- Use `github_clone_repository` when file contents, diffs, tests, or repository
  structure matter. Pass the repository owner and name explicitly and inspect
  only what is needed.

Comments:
- Use `github_add_issue_comment` for explicitly requested GitHub issue or pull
  request comments. Pull request conversations use the pull request number as
  the issue number.
- Reply through the provider that triggered the run unless the user asks you to
  comment on GitHub.
- Send one GitHub comment unless the task explicitly needs multiple.

Format:
- Keep comments concise and practical.
- Use GitHub-flavored Markdown.
- Link to files, issues, pull requests, commits, or external context only when
  it helps the user act.
