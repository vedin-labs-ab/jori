---
name: linear
description: Built-in Linear skill for reading issue context and sending concise issue comments.
---

# Linear

Use Linear for issue context and issue comments.

Context:
- Read the triggering issue before answering when the issue title,
  description, status, or comments materially change the response.
- Use `linear_get_issue` for the target issue and `linear_list_comments` when
  the comment thread matters.
- Use `linear_search_issues` when the target issue is described by title,
  identifier, or other text and you do not already have the exact issue ID.
  Then use `linear_get_issue` once the target issue is identified.
- Treat Linear issue IDs, identifiers, URLs, and comment IDs as provider-native
  references. Do not invent issue keys or user mentions.

Replies and requested Linear comments:
- Use `linear_add_comment` for Linear replies and explicitly requested Linear
  comments.
- Prefer the trigger issue for status replies unless the user asks for another
  issue.
- Send one comment unless the task explicitly needs multiple.
- After the comment succeeds, stop.

Format:
- Keep comments concise and practical.
- Use plain Markdown that reads naturally inside Linear.
- Link to external context only when it helps the user act.
