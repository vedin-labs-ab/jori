---
name: slack
description: Built-in Slack skill for native messages, with correct mrkdwn formatting, Block Kit blocks, links, escaping, and threading.
---

# Slack

Format Slack messages so they feel native to Slack:
- Write concise Slack `mrkdwn`. It is not standard Markdown: *bold*, _italic_,
  `code`, and > quote render; **bold** and [label](url) do not.
- Use Slack link syntax like `<https://example.com|label>` and mention people
  with `<@USER_ID>`.
- Escape literal `&`, `<`, and `>` in Slack text unless using them for Slack
  link, mention, or date syntax.
- When replying to a message, reply in its thread: set `thread_ts` to the
  thread timestamp, or to the message timestamp to start one.
- Keep simple replies plain `text`, but use Block Kit `blocks`
  (https://docs.slack.dev/reference/block-kit/blocks) when structure makes a
  message easier to scan: reports, comparisons, tables, summaries with clear
  sections, or any request that asks for a table.
- For table-shaped data, prefer a Slack table block over code-fenced text:
  use `data_table` for plain sortable/paginated data and `table` when cells
  need richer formatting like links or emphasis. Include concise fallback
  `text` for notifications.
- Use `section`, `header`, `divider`, and `context` blocks to create readable
  Slack-native reports. Avoid large monolithic text blocks when multiple
  small blocks would scan better.
- Skip interactive elements like buttons, inputs, and menus.
- Never use `card` blocks.
