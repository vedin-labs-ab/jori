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
- Use `channels_list` to resolve channel names. It accepts channel types,
  sorting, limit, and cursor only; do not pass query-style filters. Strip a
  leading `#` when matching a returned channel name.

Replies and requested Slack posts:
- Use `conversations_add_message` for Slack replies and explicitly requested
  Slack posts.
- Prefer the trigger target for status replies unless the user asks for another
  channel or thread.
- When the user explicitly names a Slack channel, prefer the resolved channel ID
  if lookup succeeds. If lookup is inconclusive, use the explicit `#channel`
  name rather than claiming the channel does not exist.
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
