---
name: slack
description: Built-in Slack skill for native messages, with correct mrkdwn formatting, Block Kit blocks, links, escaping, and threading.
---

# Slack

Format Slack messages so they feel native to Slack:
- Use plain `text` for direct replies. When using plain `text`, write concise
  Slack `mrkdwn`: *bold*, _italic_, `code`, and > quote render; **bold** and
  [label](url) do not.
- Use Slack-native `blocks`
  (https://docs.slack.dev/reference/block-kit/blocks) when structure,
  hierarchy, or a requested presentation makes the answer clearer, easier to
  scan, or easier to act on.
- Include concise fallback `text` with `blocks`.
- Use Slack link syntax like `<https://example.com|label>` and mention people
  with `<@USER_ID>`.
- Escape literal `&`, `<`, and `>` in Slack text unless using them for Slack
  link, mention, or date syntax.
- Do not use interactive elements like buttons, inputs, or menus.
- Do not use `card` blocks.
