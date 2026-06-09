---
name: github
description: Built-in GitHub skill for inspecting connected repositories and replying to GitHub comment threads.
---

# GitHub

Use GitHub for connected repository context and GitHub replies.

Context:
- Use `github_list_repositories` when the user asks what GitHub repositories or
  projects are available.
- Use `github_get_repository`, `github_search_issues`, and `github_get_file`
  for focused repository, issue, pull request, and file lookup.
- Start with `github_get_trigger_context` when issue, pull request, comment, or
  adjacent discussion context could change the answer.
- Use `github_request` only for target-repository GitHub REST API calls in a
  GitHub-triggered run.
- Use `github_clone_repository` when file contents, diffs, tests, or repository
  structure matter and cloning is available. Inspect only what is needed.

Replies:
- Send the final response with `github_reply` when a reply is useful.
- Reply only in the GitHub thread that triggered the run. For non-GitHub
  triggers, reply through the triggering provider instead.
- Send one comment unless the task explicitly needs multiple.
- After the reply succeeds, stop.

Format:
- Keep comments concise and practical.
- Use GitHub-flavored Markdown.
- Link to files, issues, pull requests, commits, or external context only when
  it helps the user act.
