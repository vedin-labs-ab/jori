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
- Choose the format around the user's goal and the reader's next action. Use
  plain `text` when that is enough; use Block Kit `blocks`
  (https://docs.slack.dev/reference/block-kit/blocks) when native Slack
  structure makes the answer easier to understand or act on.
- When the user asks for a specific layout or presentation, use the closest
  Slack-native representation instead of simulating it with Markdown or code
  fences. Include concise fallback `text` whenever sending `blocks`.
- Skip interactive elements like buttons, inputs, and menus.
- Never use `card` blocks.
