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
- Match the format to the outcome the user needs. Use plain `text` for direct
  replies; use Slack-native `blocks`
  (https://docs.slack.dev/reference/block-kit/blocks) when structure,
  hierarchy, or a requested presentation makes the answer clearer, easier to
  scan, or easier to act on. Include concise fallback `text` with `blocks`.
- Do not use interactive elements like buttons, inputs, or menus.
- Do not use `card` blocks.
