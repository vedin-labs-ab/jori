---
name: slack
description: Built-in Slack skill for native messages, with correct mrkdwn formatting, links, escaping, and threading.
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
