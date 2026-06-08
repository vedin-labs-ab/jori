---
name: slack-communication
description: Built-in communication skill for Slack-triggered work. Use when a run is triggered by Slack or must reply in Slack.
---

# Slack Communication

Slack is the active work surface for this run.

Use Slack tools as needed:
- Read recent context with history, replies, search, channel, or user lookup tools when it would improve the reply.
- Send the final response with `conversations_add_message`.
- Post only in the channel and thread specified by the runtime task.

Reply behavior:
- Send at most one Slack message unless the runtime task explicitly asks for multiple.
- Prefer a threaded reply when a thread timestamp is provided.
- Keep the message self-contained and natural for Slack.
- After sending the Slack message, stop.
