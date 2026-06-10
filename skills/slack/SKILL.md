---
name: slack
description: Built-in Slack formatting skill for concise, provider-native Slack messages.
---

# Slack

Format Slack messages so they feel native to Slack:
- Use concise `mrkdwn` text for simple conversational replies.
- Use Block Kit `blocks` only when structure makes the message easier to scan,
  and include a clear top-level `text` fallback.
- Keep blocks practical, not decorative.
- Use Slack link syntax like `<https://example.com|label>`.
- Escape literal `&`, `<`, and `>` in Slack text unless using them for Slack
  link, mention, or date syntax.
