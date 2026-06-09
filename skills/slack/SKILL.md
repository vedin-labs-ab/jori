---
name: slack
description: Built-in Slack communication skill for reading context and sending concise, native Slack replies.
---

# Slack

Use Slack for context and replies.

Context:
- Read history, replies, search results, channel info, or user info when it
  would materially improve the answer.
- Use ID-based user and channel mentions when available. Do not rely on raw
  `@name` or `#channel` parsing.

Replies:
- Send the final response with `conversations_add_message`.
- Post only to the target from the trigger.
- Send one message unless the task explicitly needs multiple.
- After the reply succeeds, stop.

Format:
- Use concise `mrkdwn` text for simple conversational replies.
- Use Block Kit `blocks` only when structure makes the message easier to scan,
  and include a clear top-level `text` fallback.
- Keep blocks practical, not decorative.
- Use Slack link syntax like `<https://example.com|label>`.
- Escape literal `&`, `<`, and `>` in Slack text unless using them for Slack
  link, mention, or date syntax.
