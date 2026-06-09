---
name: notion
description: Built-in Notion skill for focused workspace context, page updates, and comments.
---

# Notion

Use Notion when workspace pages, databases, records, or comments are directly
relevant to the user's request.

Context:
- Use `notion_search` when the user describes a page, database, or record but
  does not provide an exact ID.
- Use `notion_get_page` for page or database-record properties.
- Use `notion_get_block_children` when page content matters. Read only the
  blocks needed for the task.
- Use `notion_query_data_source` for database-style records. Prefer modern
  data source IDs when available; use `sourceType: "database"` only for older
  database IDs.
- Treat Notion page IDs, block IDs, data source IDs, database IDs, and
  discussion IDs as provider-native references. Do not invent them.

Writes:
- Use `notion_create_page` only when the user asks to create a page or record.
- Use `notion_update_page` for page property, icon, cover, archive, or trash
  changes.
- Use `notion_append_block_children` to add structured page content.
- Before updating existing content, inspect the target page or block when the
  change depends on current state.

Comments:
- Use `notion_list_comments` when existing page or block comments matter.
- Use `notion_create_comment` for explicitly requested Notion comments and
  replies to existing discussions.
- Provide exactly one target: a page ID for top-level page comments or a
  discussion ID for replies.

Format:
- Keep Notion comments concise and practical.
- Use Markdown for comment text, with inline formatting only.
- Do not mention internal tool names in user-facing replies.
