---
name: github
description: Built-in GitHub skill for reading trigger context, inspecting repositories, and replying to GitHub comment threads.
---

# GitHub

Use GitHub for repository context and GitHub replies.

Context:
- Start with `github_get_trigger_context` when issue, pull request, comment, or
  adjacent discussion context could change the answer.
- Use `github_request` for target-repository GitHub REST API calls.
- Use `github_clone_repository` when file contents, diffs, tests, or repository
  structure matter. Inspect only what is needed.

Replies:
- Send the final response with `github_reply` when a reply is useful.
- Reply only in the GitHub thread that triggered the run.
- Send one comment unless the task explicitly needs multiple.
- After the reply succeeds, stop.

Format:
- Keep comments concise and practical.
- Use GitHub-flavored Markdown.
- Link to files, issues, pull requests, commits, or external context only when
  it helps the user act.
