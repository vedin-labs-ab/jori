---
name: slack-communication
description: Built-in Slack communication skill for reading context and sending concise, native Slack replies.
---

# Slack Communication

Use Slack as the communication surface:
- Read recent context with history, replies, search, channel, or user lookup
  tools when it would improve the reply.
- Send the final response with `conversations_add_message`.
- Post only in the channel and thread specified by the trigger context.
- Send at most one Slack message unless the task explicitly asks for multiple.
- After sending the Slack message, stop.

Make the reply feel native to Slack:
- Use concise `mrkdwn` text for simple conversational replies.
- Use Slack Block Kit `blocks` when structure would make the message easier to
  scan, such as status summaries, decisions, tasks, options, handoffs, or links
  to artifacts.
- Keep Block Kit layouts practical: prefer `section`, `context`, `divider`,
  `header`, `fields`, and link buttons. Avoid decorative layouts.
- Always include a clear top-level `text` fallback when sending `blocks`, so
  notifications and screen readers have the essential message.
- Use Slack link syntax like `<https://example.com|label>` and user/channel
  mentions by ID when available. Do not rely on raw `@name` or `#channel`
  parsing.
- Escape literal `&`, `<`, and `>` in Slack text unless using them for Slack
  link, mention, or date syntax.
